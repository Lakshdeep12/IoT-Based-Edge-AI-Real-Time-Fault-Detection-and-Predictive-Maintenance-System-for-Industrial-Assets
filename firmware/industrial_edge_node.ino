#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>

static const char *WIFI_SSID = "YOUR_WIFI_SSID";
static const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
static const char *API_ENDPOINT = "http://192.168.1.10:8000/api/telemetry";
static const char *DEVICE_ID = "ESP32-001";

static const uint8_t I2C_SDA_PIN = 8;
static const uint8_t I2C_SCL_PIN = 9;
static const uint8_t ONE_WIRE_PIN = 10;
static const uint32_t SAMPLE_PERIOD_MS = 200;
static const uint32_t POST_PERIOD_MS = 5000;
static const uint32_t ALERT_HOLD_MS = 3000;
static const float VIB_FAULT_THRESHOLD = 18.0f; // m/s^2
static const float TEMP_FAULT_THRESHOLD = 30.0f; // C

static const uint8_t MPU6050_ADDR = 0x68;
static const float MPU6050_ACCEL_SENS_2G = 16384.0f; // LSB/g
static const float G0 = 9.80665f;

LiquidCrystal_I2C lcd(0x27, 16, 2);
OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature ds18b20(&oneWire);

bool mpuOk = false;
bool dsOk = false;
bool lcdOk = false;
bool headerPrinted = false;

uint32_t lastSampleMs = 0;
uint32_t lastPostMs = 0;
uint32_t alertUntilMs = 0;

static void lcdPrintLine(uint8_t row, const String &text) {
  if (!lcdOk) return;
  lcd.setCursor(0, row);
  String s = text;
  if (s.length() > 16) s = s.substring(0, 16);
  lcd.print(s);
  for (uint8_t i = s.length(); i < 16; ++i) lcd.print(' ');
}

static void lcdPrintCentered(uint8_t row, const String &text) {
  if (!lcdOk) return;
  String s = text;
  if (s.length() > 16) s = s.substring(0, 16);
  uint8_t col = (16 - s.length()) / 2;
  lcd.setCursor(0, row);
  for (uint8_t i = 0; i < 16; ++i) lcd.print(' ');
  lcd.setCursor(col, row);
  lcd.print(s);
}

static void i2cWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission(true);
}

static bool i2cReadBytes(uint8_t reg, uint8_t *buf, size_t len) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  size_t got = Wire.requestFrom((int)MPU6050_ADDR, (int)len, (int)true);
  if (got != len) return false;
  for (size_t i = 0; i < len; ++i) buf[i] = Wire.read();
  return true;
}

static bool initMPU6050() {
  uint8_t who = 0;
  if (!i2cReadBytes(0x75, &who, 1)) return false;
  if (who != 0x68) return false;

  i2cWrite(0x6B, 0x00); // PWR_MGMT_1: wake up
  delay(50);
  i2cWrite(0x1B, 0x00); // gyro full-scale +/-250 dps
  i2cWrite(0x1C, 0x00); // accel full-scale +/-2g
  i2cWrite(0x1A, 0x03); // DLPF
  i2cWrite(0x19, 0x04); // sample rate divider
  return true;
}

static bool readMPU6050Raw(int16_t &ax, int16_t &ay, int16_t &az) {
  uint8_t buf[6];
  if (!i2cReadBytes(0x3B, buf, 6)) return false;
  ax = (int16_t)((buf[0] << 8) | buf[1]);
  ay = (int16_t)((buf[2] << 8) | buf[3]);
  az = (int16_t)((buf[4] << 8) | buf[5]);
  return true;
}

static String fmtFloat(float v, uint8_t decimals) {
  if (isnan(v)) return "NaN";
  char buf[20];
  dtostrf(v, 0, decimals, buf);
  return String(buf);
}

static void printCsvLine(uint32_t ts, float vib, float tempC, bool fault) {
  if (!headerPrinted) {
    Serial.println("timestamp_ms,vibration_mps2,temp_c,fault_flag");
    headerPrinted = true;
  }
  Serial.print(ts);
  Serial.print(',');
  Serial.print(fmtFloat(vib, 3));
  Serial.print(',');
  Serial.print(fmtFloat(tempC, 2));
  Serial.print(',');
  Serial.println(fault ? 1 : 0);
}

static void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t startMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startMs < 12000) {
    delay(300);
    Serial.print('.');
  }
  Serial.println();
  Serial.print("WiFi status: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "connected" : "offline");
}

static void postTelemetry(float tempC, float vib) {
  if (WiFi.status() != WL_CONNECTED || isnan(tempC) || isnan(vib)) return;

  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"temperature\":" + fmtFloat(tempC, 2) + ",";
  body += "\"vibration\":" + fmtFloat(vib, 3);
  body += "}";

  int code = http.POST(body);
  Serial.print("REST POST status: ");
  Serial.println(code);
  http.end();
}

static void showFaultScreen(float vib, float tempC, bool mpuMissing, bool dsMissing) {
  if (!lcdOk) return;
  // Let the centered helper print lines individually to stop flashing
  lcdPrintCentered(0, "!! FAULT DETECTED !!");
  if (mpuMissing && dsMissing) {
    lcdPrintCentered(1, "MPU+TEMP ERR");
  } else if (mpuMissing) {
    lcdPrintCentered(1, "MPU6050 ERROR");
  } else if (dsMissing) {
    lcdPrintCentered(1, "DS18B20 ERROR");
  } else {
    String line = "V:" + fmtFloat(vib, 1) + " T:" + fmtFloat(tempC, 1);
    lcdPrintCentered(1, line);
  }
}

// --- UPDATED FOR THE STATUS FLEX ---
static void showNormalScreen(float vib, float tempC) {
  if (!lcdOk) return;
  
  // Line 0: Beautifully centered system health status
  lcdPrintCentered(0, "STATUS: SAFE");
  
  // Line 1: Compressed compact readout to show off metrics cleanly
  // Format: V:XX.X  T:XX.X(deg)C
  String l1 = "V:" + fmtFloat(vib, 1) + " T:" + fmtFloat(tempC, 1) + (char)223 + "C";
  lcdPrintCentered(1, l1);
}

void setup() {
  Serial.begin(115200);
  delay(200);
  connectWiFi();

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(400000);

  lcd.init();
  lcd.backlight();
  lcdOk = true;
  lcd.clear();
  lcdPrintCentered(0, "Edge IoT Monitor");
  lcdPrintCentered(1, "Initializing...");

  mpuOk = initMPU6050();

  ds18b20.begin();
  dsOk = (ds18b20.getDeviceCount() > 0);

  if (lcdOk) {
    lcd.clear();
    lcdPrintLine(0, String("MPU:") + (mpuOk ? "OK" : "ERR") + " DS:" + (dsOk ? "OK" : "ERR"));
    lcdPrintLine(1, "CSV @115200");
    delay(1500); // Give the operator time to view sensor status checks
  }

  lastSampleMs = millis();
}

void loop() {
  const uint32_t now = millis();
  if (now - lastSampleMs < SAMPLE_PERIOD_MS) return;
  lastSampleMs = now;

  float vib = NAN;
  float tempC = NAN;
  bool fault = false;

  if (mpuOk) {
    int16_t axRaw, ayRaw, azRaw;
    if (readMPU6050Raw(axRaw, ayRaw, azRaw)) {
      const float ax = ((float)axRaw / MPU6050_ACCEL_SENS_2G) * G0;
      const float ay = ((float)ayRaw / MPU6050_ACCEL_SENS_2G) * G0;
      const float az = ((float)azRaw / MPU6050_ACCEL_SENS_2G) * G0;
      vib = sqrtf(ax * ax + ay * ay + az * az);
    } else {
      mpuOk = false;
    }
  }

  if (dsOk) {
    ds18b20.requestTemperatures();
    tempC = ds18b20.getTempCByIndex(0);
    if (tempC == DEVICE_DISCONNECTED_C) {
      dsOk = false;
      tempC = NAN;
    }
  }

  const bool sensorMissing = (!mpuOk || !dsOk);
  const bool valueFault = (!isnan(vib) && vib > VIB_FAULT_THRESHOLD) || (!isnan(tempC) && tempC > TEMP_FAULT_THRESHOLD);
  fault = sensorMissing || valueFault;

  if (fault) {
    if (now > alertUntilMs) alertUntilMs = now + ALERT_HOLD_MS;
  }

  const bool alertActive = fault || (now < alertUntilMs);

  if (alertActive) {
    showFaultScreen(vib, tempC, !mpuOk, !dsOk);
  } else {
    showNormalScreen(vib, tempC);
  }

  printCsvLine(now, vib, tempC, fault ? 1 : 0);

  if (now - lastPostMs >= POST_PERIOD_MS) {
    lastPostMs = now;
    postTelemetry(tempC, vib);
  }
}
