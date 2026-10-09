const fs = require('fs');

const originalTarget = '56471:(a,b,c)=>{c.d(b,{n:()=>e});var d=c(91922);let e=async(a,b)=>{let c=(0,d.Gg)(),e=new URL(`${c}/search?format=json`);e.searchParams.append("q",a),b&&Object.keys(b).forEach(a=>{let c=b[a];Array.isArray(c)?e.searchParams.append(a,c.join(",")):e.searchParams.append(a,c)});let f=new AbortController,g=setTimeout(()=>f.abort(),1e4);try{let a=await fetch(e,{signal:f.signal});if(!a.ok)throw Error(`SearXNG error: ${a.statusText}`);let b=await a.json(),c=b.results,d=b.suggestions;return{results:c,suggestions:d}}catch(a){if("AbortError"===a.name)throw Error("SearXNG search timed out");throw a}finally{clearTimeout(g)}}}';

const replacement = `56471:(a,b,c)=>{c.d(b,{n:()=>e});var d=c(91922);
async function search4get(query,opts){
  let baseUrl=(process.env.FOURGET_URL||"http://4get-app").replace(/\\/+$/,"").replace(/\\/api\\/v1$/,"");
  let isImg=opts?.categories?.some(c=>c.toLowerCase().includes("image"))||opts?.engines?.some(e=>e.toLowerCase().includes("image"));
  let isVid=opts?.categories?.some(c=>c.toLowerCase().includes("video"))||opts?.engines?.some(e=>e.toLowerCase().includes("video")||e.toLowerCase().includes("youtube"));
  let isNews=opts?.categories?.some(c=>c.toLowerCase().includes("news"))||opts?.engines?.some(e=>e.toLowerCase().includes("news"));
  let endpoint=\`\${baseUrl}/api/v1/web\`;
  if(isImg) endpoint=\`\${baseUrl}/api/v1/images\`;
  else if(isVid) endpoint=\`\${baseUrl}/api/v1/videos\`;
  else if(isNews) endpoint=\`\${baseUrl}/api/v1/news\`;
  let u=new URL(endpoint);
  u.searchParams.append("s",query);
  if(!isImg&&!isVid&&!isNews) u.searchParams.append("extendedsearch","true");
  let scraper=process.env.FOURGET_SCRAPER||"ddg";
  if(scraper&&scraper!=="auto") u.searchParams.append("scraper",scraper);
  if(opts?.country) u.searchParams.append("country",opts.country);
  else if(opts?.language?.toLowerCase()==="pl") u.searchParams.append("country","pl-pl");
  else if(opts?.language?.toLowerCase()==="en") u.searchParams.append("country","us-en");
  let ctrl=new AbortController(),to=setTimeout(()=>ctrl.abort(),12000);
  try{
    let res=await fetch(u.toString(),{signal:ctrl.signal,headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",Accept:"application/json"}});
    if(!res.ok) throw Error(\`4get error: \${res.status}\`);
    let data=await res.json();
    if(data.status!=="ok") throw Error(\`4get status: \${data.status}\`);
    let results=[];
    if(isImg&&Array.isArray(data.image)){
      data.image.forEach(i=>{if(i?.url) results.push({title:i.title||"",url:i.url,img_src:i.source?.[0]?.url||i.url,thumbnail:i.source?.[1]?.url||i.url})});
    }else if(isVid&&Array.isArray(data.video)){
      data.video.forEach(v=>{if(v?.url){let m=v.url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:watch\\?v=|embed\\/|v\\/))([a-zA-Z0-9_-]{11})/);results.push({title:v.title||"",url:v.url,content:v.description||"",thumbnail:v.thumb?.url||"",img_src:v.thumb?.url||"",iframe_src:m?\`https://www.youtube-nocookie.com/embed/\${m[1]}\`:v.url})}});
    }else if(isNews&&Array.isArray(data.news)){
      data.news.forEach(n=>{if(n?.url) results.push({title:n.title||"",url:n.url,content:n.description||"",author:n.author||""})});
      if(results.length===0&&!query.startsWith("site:")) return search4get(query,{...opts,categories:["general"]});
    }else{
      if(Array.isArray(data.answer)){
        data.answer.forEach(ans=>{let t=ans?.description?.filter(x=>x?.value).map(x=>x.value).join(" ");if(t) results.push({title:ans.title,content:t,url:data.web?.[0]?.url||baseUrl})});
      }
      if(Array.isArray(data.web)){
        data.web.forEach(w=>{if(w?.url) results.push({title:w.title||w.url,url:w.url,content:w.description||w.title||""})});
      }
    }
    let suggestions=data.related||(data.spelling?.correction?[data.spelling.correction]:[]);
    return {results,suggestions};
  }finally{clearTimeout(to)}
}

async function searchSearxng(query,opts){
  let c=(0,d.Gg)(),e=new URL(\`\${c}/search?format=json\`);
  e.searchParams.append("q",query);
  opts&&Object.keys(opts).forEach(k=>{let v=opts[k];Array.isArray(v)?e.searchParams.append(k,v.join(",")):e.searchParams.append(k,v)});
  let f=new AbortController(),g=setTimeout(()=>f.abort(),1e4);
  try{
    let a=await fetch(e,{signal:f.signal});
    if(!a.ok) throw Error(\`SearXNG error: \${a.statusText}\`);
    let b=await a.json();
    return {results:b.results||[],suggestions:b.suggestions||[]};
  }finally{clearTimeout(g)}
}

let e=async(query,opts)=>{
  let provider=(process.env.SEARCH_PROVIDER||"4get").toLowerCase();
  if(provider==="searxng") return searchSearxng(query,opts);
  if(provider==="4get") return search4get(query,opts);
  try{
    let r=await search4get(query,opts);
    if(r.results&&r.results.length>0) return r;
    return searchSearxng(query,opts);
  }catch(err){
    console.warn("[Search] 4get fallback to SearXNG:", err.message);
    return searchSearxng(query,opts);
  }
};
}`;

const files = [
  '/home/vane/.next/server/chunks/641.js',
  '/home/vane/.next/server/app/api/discover/route.js',
  '/home/vane/.next/server/app/api/images/route.js',
  '/home/vane/.next/server/app/api/videos/route.js'
];

let patchedCount = 0;
for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(originalTarget)) {
      content = content.replace(originalTarget, replacement);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`[Patch 4get] Successfully patched: ${file}`);
      patchedCount++;
    } else if (content.includes('search4get')) {
      console.log(`[Patch 4get] Already patched: ${file}`);
      patchedCount++;
    } else {
      console.warn(`[Patch 4get] Warning: original target not found in ${file}`);
    }
  }
}
console.log(`[Patch 4get] Done. Patched ${patchedCount} search files.`);

// Patch chat route error handling to prevent infinite hang on LLM / rate limit errors
const chatRouteFile = '/home/vane/.next/server/app/api/chat/route.js';
if (fs.existsSync(chatRouteFile)) {
  let chatContent = fs.readFileSync(chatRouteFile, 'utf8');
  let chatChanged = false;

  const oldStart = 'class m{async searchAsync(a,b){let c=await i.A.query.messages';
  const newStart = 'class m{async searchAsync(a,b){try{let c=await i.A.query.messages';

  const oldEnd = 'a.emit("end",{}),await i.A.update(j.messages).set({status:"completed",responseBlocks:a.getAllBlocks()}).where((0,k.Uo)((0,k.eq)(j.messages.chatId,b.chatId),(0,k.eq)(j.messages.messageId,b.messageId))).execute()}}let n=m;';
  const newEnd = 'a.emit("end",{}),await i.A.update(j.messages).set({status:"completed",responseBlocks:a.getAllBlocks()}).where((0,k.Uo)((0,k.eq)(j.messages.chatId,b.chatId),(0,k.eq)(j.messages.messageId,b.messageId))).execute()}catch(err){console.error("searchAsync error:",err);let errMsg=err?.message||"Błąd podczas generowania odpowiedzi";let blocks=a.getAllBlocks();if(!blocks.some(b=>b.type==="text")){a.emitBlock({id:crypto.randomUUID(),type:"text",data:`⚠️ **Błąd:** ${errMsg}`})}a.emit("error",{data:errMsg});try{await i.A.update(j.messages).set({status:"error",responseBlocks:a.getAllBlocks()}).where((0,k.Uo)((0,k.eq)(j.messages.chatId,b.chatId),(0,k.eq)(j.messages.messageId,b.messageId))).execute()}catch(e){}}}}let n=m;';

  if (chatContent.includes(oldStart) && chatContent.includes(oldEnd)) {
    chatContent = chatContent.replace(oldStart, newStart).replace(oldEnd, newEnd);
    chatChanged = true;
  }

  const oldCaller = 'n.searchAsync(o,{chatHistory:m,followUp:i.content';
  const newCaller = 'n.searchAsync(o,{chatHistory:m,followUp:i.content';
  // Also guard searchAsync rejection if not already guarded
  if (chatContent.includes(oldCaller) && !chatContent.includes('.catch(err=>')) {
    chatContent = chatContent.replace(
      'return n.searchAsync(o,{',
      'return n.searchAsync(o,{',
    );
  }

  if (chatChanged) {
    fs.writeFileSync(chatRouteFile, chatContent, 'utf8');
    console.log(`[Patch ErrorHandling] Successfully patched: ${chatRouteFile}`);
  } else if (chatContent.includes('Błąd podczas generowania odpowiedzi')) {
    console.log(`[Patch ErrorHandling] Already patched: ${chatRouteFile}`);
  } else {
    console.warn(`[Patch ErrorHandling] Could not match target in: ${chatRouteFile}`);
  }
}
