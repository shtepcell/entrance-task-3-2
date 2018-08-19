const DAY_FROM = 7,
      DAY_TO = 21;

const input = {
  devices: [],
  rates: [],
  maxPower: 0
};

const consumedEnergy = {
  value: 0,
  devices: {}
};

const schedule = {},
      hours = [];

module.exports = function(data) {
  if (!validate(data)) return {'errMsg': 'Input data is not valid!'};

  input.devices = data.devices;
  input.rates = data.rates;
  input.maxPower = data.maxPower;

  for (let i = 0; i < 24; i++) {
    schedule[i] = []
  }

  for (let i in input.rates) {
    let rate = input.rates[i],
        duration = calculateDuration(rate.from, rate.to),
        time = rate.from;

    for (let j = 0; j < duration; j++) {
      hours.push({
        time: time,
        cost: rate.value,
        devices: [],
        power: 0,
        type: (DAY_FROM <= time && DAY_TO > time)?'day':'night'
      })

      time++;
      if (time >= 24) time = time - 24;
    }
  }

  for (let i in input.devices) {
    let device = input.devices[i],
        bestPrice,
        bestTime = 0;

    for (let j = 0; j < 24; j++) {
      let cost = calculateCost(device, j);

      if (cost && cost < bestPrice || !bestPrice) {
        bestPrice = cost;
        bestTime = j;
      }

      if (device.duration == 24) j = 23;
    }

    if(!bestPrice) return {'errMsg': 'Can not schedule'};
    takeTime(device, {cost: bestPrice, time: bestTime});
  }

  consumedEnergy.value = Math.floor(consumedEnergy.value * 10000) / 10000;

  Object.keys(consumedEnergy.devices).forEach(item => {
    consumedEnergy.devices[item] =
      Math.floor(consumedEnergy.devices[item] * 10000) / 10000;
  })

  return {schedule: schedule, consumedEnergy: consumedEnergy};
}

function calculateDuration(from, to) {
  if (from < to)
    return to - from;
  else
    return (24 - from) + to;
}

function calculateCost(device, time) {
  let powerOK = false,
      modeOK = false,
      hour,
      price = 0;

  for (let i = 0; i < device.duration; i++) {
    hour = getHour(time+i);
    powerOK = (hour.power + device.power <= input.maxPower);
    modeOK = (hour.type == device.mode);

    if (!device.mode) modeOK = true;
    if (!powerOK || !modeOK) return false;
    price += ((device.power * hour.cost) / 1000);
  }
  return price;
}

function takeTime(device, info) {
  consumedEnergy.value += info.cost;
  consumedEnergy.devices[device.id] = info.cost;

  for (let i = 0; i < device.duration; i++)
    setHour(info.time+i, device);
}

function getHour(time) {
  if (time >= 24) time = time - 24;

  for (let i in hours) {
    if (hours[i].time == time) return hours[i];
  }
  return undefined;
}

function setHour(time, device) {
  if (time >= 24) time = time - 24;

  for (let i in hours) {
    if (hours[i].time == time) {
      schedule[time].push(device.id);

      hours[i].devices.push(device.name)
      hours[i].power += device.power;
    }
  }
}

function validate(data) {
  let isNotOverPower = true,
      isNotOverDuration = true,
      isCorrectRates = true,
      hasAllPower = true,
      hasAllId = true,
      hasAllDuration = true,
      hasDevices = !!data.devices && data.devices.length > 0,
      hasRates = !!data.rates && data.rates.length > 0,
      hasMaxPower = !!data.maxPower;

  if (!hasDevices) return false;
  if (!hasRates) return false;
  if (!hasMaxPower) return false;

  data.devices.forEach(device => {
    if (!device.duration) hasAllDuration = false;
    if (!device.power) hasAllPower = false;
    if (!device.id) hasAllId = false;

    if (device.power > data.maxPower) isNotOverPower = false;
    if (device.duration > 24) isNotOverDuration = false;
  })

  if (!hasAllDuration || !hasAllPower || !hasAllId ||
        !isNotOverPower || !isNotOverDuration) return false;

  let isBadTime = data.rates.some(rate => {
      return rate.from == undefined || rate.to == undefined ||
             rate.from < 0 || rate.from >= 24 ||
             rate.to < 0 || rate.to >= 24 || rate.to == rate.from;
     });

  if (isBadTime) return false;

  let from = [],
      to = [],
      coverageOk,
      counter = 0;

  data.rates.forEach(rate => {
    if ( !from.includes(rate.from) ) from.push(rate.from);
    if ( !to.includes(rate.to) ) to.push(rate.to);
  })

  coverageOk = (from.length == to.length && from.length == data.rates.length);

  if (!coverageOk) return false;

  for (let idx in from) {
    if ( to.includes(from[idx]) ) {
      counter++;
    } else coverageOk = false;
  }

  if (counter != from.length) coverageOk = false;

  return coverageOk;
}
