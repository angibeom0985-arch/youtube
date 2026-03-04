const fs = require('fs');
const env = fs.readFileSync('C:/Users/삼성/Website/Youtube/.env', 'utf8');
const match = env.match(/GOOGLE_CLOUD_API_KEY=(.*)/);
if(match){
  const key = match[1].trim();
  fetch('https://texttospeech.googleapis.com/v1/voices?key='+key)
  .then(r=>r.json())
  .then(d=>{
    const ko = d.voices.filter(v=>v.languageCodes.includes('ko-KR'));
    console.log(JSON.stringify(ko.map(v=>v.name), null, 2));
  }).catch(console.error);
}
