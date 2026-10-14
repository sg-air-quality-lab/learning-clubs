import { test } from 'node:test';
import assert from 'node:assert/strict';
import { volumeGrowth, diameterGrowth, sensorReading, pm25Band } from './scattering.ts';

test('dry air: no error', () => {
  assert.equal(sensorReading(80, 0), 80);
});

test('error stays small at moderate humidity and grows steeply when very humid', () => {
  assert.ok(volumeGrowth(50) < 1.2);
  assert.ok(volumeGrowth(80) > 1.4 && volumeGrowth(80) < 1.8);
  assert.ok(volumeGrowth(95) > 3);
  for (let rh = 0; rh < 98; rh++) assert.ok(volumeGrowth(rh + 1) > volumeGrowth(rh));
});

test('diameter growth is the cube root of volume growth', () => {
  const g = diameterGrowth(90);
  assert.ok(Math.abs(g ** 3 - volumeGrowth(90)) < 1e-9);
});

test('bands match the dashboard (55 is already Elevated)', () => {
  assert.equal(pm25Band(54), 'Normal');
  assert.equal(pm25Band(55), 'Elevated');
  assert.equal(pm25Band(150), 'High');
  assert.equal(pm25Band(250), 'Very high');
});
