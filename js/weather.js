/* ===========================================================
   [8] WEATHER (Open-Meteo)
   =========================================================== */
// Uses Open-Meteo (free, no API key, accurate)
const WEATHER_CACHE={data:null,ts:0};
const WX_LAT=37.3774,WX_LON=-122.2191;

function wmoIcon(code){
  if(code===0)return'☀️';
  if(code<=2)return'⛅';
  if(code<=3)return'☁️';
  if(code<=49)return'🌫️';
  if(code<=59)return'🌦️';
  if(code<=69)return'🌧️';
  if(code<=79)return'🌨️';
  if(code<=82)return'🌧️';
  if(code<=86)return'🌨️';
  if(code<=99)return'⛈️';
  return'🌡️';
}
function wmoText(code){
  if(code===0)return'Clear sky';
  if(code<=2)return'Partly cloudy';
  if(code<=3)return'Cloudy';
  if(code<=49)return'Foggy';
  if(code<=59)return'Drizzle';
  if(code<=69)return'Rain';
  if(code<=79)return'Snow';
  if(code<=82)return'Rain showers';
  if(code<=86)return'Snow showers';
  if(code<=99)return'Thunderstorm';
  return'Unknown';
}

async function fetchWeather(){
  const now=Date.now();
  if(WEATHER_CACHE.data&&now-WEATHER_CACHE.ts<1800000)return WEATHER_CACHE.data;
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${WX_LAT}&longitude=${WX_LON}&current=temperature_2m,weathercode,precipitation&daily=temperature_2m_max,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles&forecast_days=5`;
    const res=await fetch(url);
    const d=await res.json();
    const cur=d.current;
    const daily=d.daily;
    const forecast=daily.time.map((date,i)=>({
      date,
      high:Math.round(daily.temperature_2m_max[i]),
      rain:daily.precipitation_probability_max[i]||0,
      code:daily.weathercode[i]
    }));
    const data={
      temp:Math.round(cur.temperature_2m),
      cond:wmoText(cur.weathercode),
      icon:wmoIcon(cur.weathercode),
      forecast
    };
    WEATHER_CACHE.data=data;WEATHER_CACHE.ts=now;
    return data;
  }catch(e){console.error('Weather error:',e);return null;}
}
function getDressSuggestion(temp, cond){
  const condL=(cond||'').toLowerCase();
  const rain=condL.includes('rain')||condL.includes('drizzle')||condL.includes('shower');
  const cold=temp<45,chilly=temp>=45&&temp<58,warm=temp>=68&&temp<80,hot=temp>=80;
  let wear='';
  if(cold) wear='Thermals, fleece, winter breeches, gloves';
  else if(chilly) wear='Long sleeve, light jacket, full-seat breeches, gloves';
  else if(warm) wear='Short sleeve, regular breeches';
  else if(hot) wear='Light shirt, regular breeches, sunscreen';
  else wear='Light sweater, regular breeches';
  if(rain) wear+=' + waterproof jacket';
  return wear;
}

function renderWeatherCard(data,el){
  if(!data||!el)return;
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const forecastHtml=data.forecast.map(f=>{
    const d=new Date(f.date+'T12:00:00');
    return`<div class="weather-day">
      <div class="weather-day-name">${days[d.getDay()]}</div>
      <div style="font-size:14px">${f.code!==undefined?wmoIcon(f.code):''}</div>
      <div class="weather-day-high">${f.high}°</div>
      ${f.rain>20?`<div class="weather-day-rain">${f.rain}%</div>`:''}
    </div>`;
  }).join('');

  const dress=getDressSuggestion(parseInt(data.temp), data.cond);
  el.innerHTML=`<div class="weather-card">
    <div class="weather-left">
      <div class="weather-icon">${data.icon}</div>
      <div>
        <div class="weather-temp">${data.temp}°F</div>
        <div class="weather-cond">${data.cond} · Portola Valley</div>
      </div>
    </div>
    <div class="weather-forecast">${forecastHtml}</div>
  </div>
  <div style="background:var(--white);border-radius:10px;border:1px solid var(--sand);padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
    <div style="font-size:18px">👕</div>
    <div>
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px">Wear Today</div>
      <div style="font-size:13px;color:var(--earth);font-weight:500">${dress}</div>
    </div>
  </div>`;
}
