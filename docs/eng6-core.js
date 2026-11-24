/* ============================================================
   學生頁和儀表板共用：錯誤分類、字母比對、Firebase、朗讀
   換題目不用動這個檔案。
   ============================================================ */
(function(root){
"use strict";
var E = root.ENG6, C = {};

/* ---------- 錯誤類型 ---------- */
C.TYPES = [
  {k:"spell", n:"拼字差一點", d:"少字母、多字母、順序顛倒、母音寫錯"},
  {k:"mixup", n:"用成別的字", d:"寫成另一個真的單字，或選錯意思"},
  {k:"form",  n:"字尾沒變化", d:"字找對了，但第三人稱、複數、過去式這類變化不對"},
  {k:"func",  n:"片語的小字", d:"by、on、to、a、the、my 這類小字漏掉、多寫或用錯"},
  {k:"part",  n:"沒寫完或跳過", d:"空白、只寫開頭幾個字母，或按了跳過"},
  {k:"caps",  n:"大小寫", d:"拼對了，但國家、星期、TV 或句首沒有大寫"},
  {k:"other", n:"看不出來", d:"和正確答案差太多，歸不進前面幾類"}
];
C.typeName = function(k){ for(var i=0;i<C.TYPES.length;i++) if(C.TYPES[i].k===k) return C.TYPES[i].n; return k; };
C.SUB = {miss:"少字母", extra:"多字母", order:"順序顛倒", vowel:"母音寫錯", dbl:"重複字母", mix:"好幾處不對", space:"空格不對",
  fmiss:"漏了小字", fextra:"多了小字", fswap:"小字用錯", forder:"順序不對"};
C.WAYS = {1:"選一選", 2:"排字母", 3:"自己拼"};

/* ---------- 常見字：判斷「寫成另一個真的單字」用 ---------- */
var COMMON = ("a about act actor afraid after again age ago air all also always am an and angry animal another answer any apple april are arm art artist as ask at aunt august autumn away "+
"baby back bad bag ball banana band bank baseball basket basketball bath bathroom be beach bear beautiful because bed bedroom bee beef before begin behind bell below beside best better between big bike bird birthday black blackboard blue board boat body book bored borrow both bottle bowl box boy bread break breakfast bridge bright bring brother brown brush build bus busy but butter buy by "+
"cake call camera camp can candy cap car card care careful carry cat catch chair change cheap check cheese chicken child children chocolate city class classmate classroom clean clear climb clock close clothes cloudy club coat coffee cold collect color come comic computer cook cookie cool corn correct cost couch could count country cousin cover cow crazy cross cry cup cut cute "+
"dad dance dancer dark date daughter day dead dear december deep desk dictionary different difficult dining dinner dirty dish do doctor dog doll dollar door down draw drawer dream dress drink drive driver drop dry duck "+
"each ear early earth east easy eat egg eight eighteen eighty elephant eleven else email end engineer english enjoy enough eraser evening ever every excited excuse exercise expensive eye "+
"face fact factory fall family famous fan far farm farmer fast fat father favorite february feed feel festival fever few field fifteen fifth fifty fill find fine finger finish fire first fish fishing five fix floor flower fly fog food foot for foreign forest forget fork forty four fourteen fox france free friday friend friendly from front fruit full fun funny future "+
"game garden gate get ghost giant gift girl give glad glass glasses gloves go goat good goodbye grandfather grandma grandmother grandpa grandparents grape grass gray great green ground group grow guess guitar gym "+
"habit hair half ham hamburger hand handsome hang happen happy hard hat hate have he head healthy hear heart heat heavy hello help hen her here hi hide high hike hill him hippo his history hit hobby hold holiday home homework honest hope horse hospital hot hotel hour house how hundred hungry hurry hurt husband "+
"i ice idea if important in insect inside interested interesting island it "+
"jacket january jeans job join juice july jump june just keep key kick kid kill kind king kitchen kite knee knife knock know "+
"lake lamp language large last late later laugh lazy leaf learn leave left leg lemon lend lesson let letter library lie life light like line lion lip list listen little live living long look lose lost loud love low lucky lunch "+
"machine magic mail make man many map march mark market mask math matter may maybe meal mean meat medicine meet menu milk mine minute miss mistake modern mom monday money monkey month moon more morning most mother mountain mouse mouth move movie much museum music must my "+
"name national near neck need never new news next nice night nine nineteen ninety no noise noodle noodles north nose not note notebook nothing november now number nurse "+
"october of off office officer often oil old on once one onion only open or orange order other our out over own "+
"pack page paint pair pants papaya paper parent parents park part party pass past pay pe pear pen pencil people pepper perfect person pet phone photo piano pick picnic picture pie pig pilot pink pizza place plan plane plant plate play player please pocket point police pool poor pop popular pork possible post pot potato pound practice pray present pretty price problem program pull purple push put "+
"quarter queen question quick quiet quite rabbit radio rain raincoat rainy read ready real really red refrigerator remember repeat rest restaurant restroom rice rich ride right ring river road robot rock room rope rose round row rule ruler run "+
"sad safe salad salt same sandwich saturday save say school science scientist scooter sea season seat second see seldom sell send september serious seven seventeen seventy shake shape share shark she sheep ship shirt shoe shoes shop short shorts should shoulder shout show shy sick side sign sing singer sister sit six sixteen sixty size skirt sky sleep slim slow small smart smile smoke snack snake snow snowy so soap soccer social socks sofa some son song soon sore sorry sound soup south space speak special spell spend spoon sports spring square stair stamp stand star start station stay still stomach stop store storm story straight strange strawberry street strong student study stupid subway sugar summer sun sunday sunny supermarket sure surf surprise sweater sweet swim table tail take talk tall tape taxi tea teach teacher team teen tell ten tennis tent test thank that the theater their then there these they thick thin thing think third thirsty thirteen thirty this those thousand three throat thursday ticket tidy tie tiger time tip tire tired to today together tomato tomorrow tonight too tooth top touch towel town toy train tree trip trouble trousers truck true try tuesday turn twelve twenty twice two "+
"ugly umbrella uncle under understand uniform until up use useful usually vegetable very video village visit voice wait wake walk wall want warm wash watch water watermelon way we weak wear weather wednesday week weekend welcome well west wet whale what when where which white who whose why wife will win wind window windy winter wise wish with woman wonderful word work worker world worry worse would write writer wrong year yellow yes yesterday yet you young your zero zoo "+
"america england jog loud us helmet motorcycle cartoon tofu uniform").split(" ");

/* 不規則變化：原形 → 各種形式 */
var IRR = {be:"am is are was were been being", go:"went gone goes going", eat:"ate eaten", see:"saw seen",
 buy:"bought", take:"took taken", have:"has had having", make:"made", swim:"swam swum", do:"did does done doing",
 come:"came", run:"ran", write:"wrote written", drink:"drank drunk", sing:"sang sung", sleep:"slept",
 feel:"felt", teach:"taught", think:"thought", bring:"brought", catch:"caught", get:"got gotten", give:"gave given",
 say:"said", tell:"told", know:"knew known", fly:"flew flown", draw:"drew drawn", ride:"rode ridden", drive:"drove driven",
 speak:"spoke spoken", break:"broke broken", sit:"sat", stand:"stood", win:"won", wear:"wore worn", find:"found",
 lose:"lost", leave:"left", meet:"met", send:"sent", spend:"spent", sell:"sold", keep:"kept", begin:"began begun",
 forget:"forgot forgotten", fall:"fell fallen", grow:"grew grown", hold:"held", build:"built", feed:"fed", wake:"woke woken",
 good:"better best well", bad:"worse worst", many:"more most", child:"children", foot:"feet", tooth:"teeth", man:"men",
 woman:"women", person:"people", mouse:"mice", goose:"geese", knife:"knives", leaf:"leaves", wife:"wives"};

var KNOWN = {}, BASE_OF = {};
function has(o,k){ return Object.prototype.hasOwnProperty.call(o,k); }
COMMON.forEach(function(w){ KNOWN[w]=1; });
Object.keys(IRR).forEach(function(b){
  KNOWN[b]=1;
  IRR[b].split(" ").forEach(function(f){ KNOWN[f]=1; (BASE_OF[f]=BASE_OF[f]||[]).push(b); });
});
((E && E.bank) || []).forEach(function(q){
  [q.a].concat(q.x||[]).forEach(function(w){
    w=w.toLowerCase(); KNOWN[w]=1;
    w.split(" ").forEach(function(t){ KNOWN[t]=1; });       /* 片語裡的每個字也算認得 */
  });
});

/* 一個字可能的原形，只留下真的是單字的 */
function lemmas(w){
  var c=[w], n=w.length;
  function dbl(stem){ var k=stem.length; if(k>2 && stem[k-1]===stem[k-2]) c.push(stem.slice(0,-1)); }
  if(has(BASE_OF,w)) c=c.concat(BASE_OF[w]);
  if(/ies$/.test(w)) c.push(w.slice(0,-3)+"y");
  if(/es$/.test(w))  c.push(w.slice(0,-2));
  if(/[^s]s$/.test(w)) c.push(w.slice(0,-1));
  if(/ied$/.test(w)) c.push(w.slice(0,-3)+"y");
  if(/ed$/.test(w)){ c.push(w.slice(0,-2), w.slice(0,-1)); dbl(w.slice(0,-2)); }
  if(/ing$/.test(w) && n>4){ c.push(w.slice(0,-3), w.slice(0,-3)+"e"); dbl(w.slice(0,-3)); }
  if(/(er|or)$/.test(w) && n>4){ c.push(w.slice(0,-2), w.slice(0,-1)); dbl(w.slice(0,-2)); }
  if(/ier$/.test(w)) c.push(w.slice(0,-3)+"y");
  if(/est$/.test(w) && n>4){ c.push(w.slice(0,-3), w.slice(0,-2)); dbl(w.slice(0,-3)); }
  return c.filter(function(x,i){ return x.length>1 && has(KNOWN,x) && c.indexOf(x)===i; });
}
/* 看起來像 -er 但其實不是從前面那個字變來的，避免誤判成字尾變化 */
var NOT_FAMILY = {letter:1, matter:1, flower:1, corner:1, summer:1, dinner:1, number:1, shower:1, tower:1, doctor:1};
function sameFamily(a,b){
  if(a===b) return false;
  if(/ing$/.test(a) && /ing$/.test(b)) return false;                 /* joging 是拼錯，不是字尾沒變化 */
  if(b===a+"s" && /s$/.test(a)) return false;                        /* buss 也是拼錯 */
  if(has(NOT_FAMILY,a) || has(NOT_FAMILY,b)) return (a===b+"s" || b===a+"s");
  var la=lemmas(a), lb=lemmas(b);
  for(var i=0;i<la.length;i++) if(lb.indexOf(la[i])>=0) return true;
  return ["s","es","d","ed","ing"].some(function(x){ return b===a+x || (b.length>3 && a===b+x); });
}

/* 編輯距離（相鄰兩字母對調算一步） */
function dist(a,b){
  var m=a.length,n=b.length,d=[],i,j;
  for(i=0;i<=m;i++){ d[i]=[i]; }
  for(j=0;j<=n;j++) d[0][j]=j;
  for(i=1;i<=m;i++) for(j=1;j<=n;j++){
    var c=a[i-1]===b[j-1]?0:1;
    d[i][j]=Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+c);
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j], d[i-2][j-2]+1);
  }
  return d[m][n];
}
function isSub(s,t){ var i=0; for(var j=0;j<t.length&&i<s.length;j++) if(s[i]===t[j]) i++; return i===s.length; }
function squeeze(s){ return s.replace(/(.)\1+/g,"$1"); }
function subtype(a,g){
  if(squeeze(a)===squeeze(g)) return "dbl";
  if(a.split("").sort().join("")===g.split("").sort().join("")) return "order";
  if(g.length<a.length && isSub(g,a)) return "miss";
  if(g.length>a.length && isSub(a,g)) return "extra";
  if(g.length===a.length){
    var ok=true;
    for(var i=0;i<a.length;i++) if(a[i]!==g[i] && !(/[aeiou]/.test(a[i]) && /[aeiou]/.test(g[i]))){ ok=false; break; }
    if(ok) return "vowel";
  }
  return "mix";
}
C._known = function(w){ return lemmas(w).length>0 || w.length===1; };          /* 給 check_bank.js 用 */
C.norm = function(s){ return String(s==null?"":s).replace(/[’‘]/g,"'").replace(/\s+/g," ").trim(); };

/* ---------- 片語：一個字一個字對，分得出是小字、拼字還是用錯字 ---------- */
var SMALL = {}; "a an the my his her your our their its to at in on by for of with from up".split(" ").forEach(function(w){ SMALL[w]=1; });
function near(x,y){ var k=dist(x,y), lim=Math.max(1,Math.floor(x.length*0.4)); if(x.length>=4 && x.slice(0,2)===y.slice(0,2)) lim++; return k<=lim ? k : 0; }
function rel(x,y){
  if(x===y) return ["=",0];
  var sx=has(SMALL,x), sy=has(SMALL,y);
  if(sx && sy) return ["swap",1];
  if(sx!==sy){
    if(sx && dist(x,y)<=1 && y.length<=x.length+1) return ["swap",0.9];      /* too、buy 這種寫法 */
    return ["no",4];
  }
  if(sameFamily(x,y)) return ["fam",0.5];
  if(has(KNOWN,y)) return ["known",1.4];
  if(y.length<=2 && x.length>=3 && x.indexOf(y)===0) return ["cut",1.2];
  var k=near(x,y); if(k) return ["near",0.4,k];
  if(x.indexOf(y)===0) return ["cut",1.2];
  return ["junk",1.5];
}
function pairs(A,G){
  var m=A.length, n=G.length, d=[], i, j;
  function gap(w){ return has(SMALL,w)?1:1.5; }
  d[0]=[0];
  for(i=1;i<=m;i++) d[i]=[d[i-1][0]+gap(A[i-1])];
  for(j=1;j<=n;j++) d[0][j]=d[0][j-1]+gap(G[j-1]);
  for(i=1;i<=m;i++) for(j=1;j<=n;j++)
    d[i][j]=Math.min(d[i-1][j]+gap(A[i-1]), d[i][j-1]+gap(G[j-1]), d[i-1][j-1]+rel(A[i-1],G[j-1])[1]);
  var out=[]; i=m; j=n;
  while(i>0||j>0){
    var r=(i>0&&j>0)?rel(A[i-1],G[j-1]):null;
    if(r && Math.abs(d[i][j]-(d[i-1][j-1]+r[1]))<1e-9){ out.unshift({k:r[0], i:i-1, x:A[i-1], y:G[j-1], n:r[2]||0}); i--; j--; }
    else if(i>0 && Math.abs(d[i][j]-(d[i-1][j]+gap(A[i-1])))<1e-9){ out.unshift({k:has(SMALL,A[i-1])?"fmiss":"miss", i:i-1, x:A[i-1], y:""}); i--; }
    else { out.unshift({k:has(SMALL,G[j-1])?"fextra":"extra", i:i, x:"", y:G[j-1]}); j--; }
  }
  return out;
}
function phrase(a,g){
  var A=a.split(" "), G=g.split(" "), aj=A.join(""), gj=G.join(""), c={}, it;
  if(aj===gj) return {t:"spell", d:"space", n:0};
  if(A.slice().sort().join(" ")===G.slice().sort().join(" ")) return {t:"func", d:"forder"};
  for(var i=0;i<A.length;i++) if(has(SMALL,A[i]) && A.filter(function(_,k){ return k!==i; }).join("")===gj) return {t:"func", d:"fmiss", it:[{k:"fmiss",i:i}]};
  it=pairs(A,G);
  it.forEach(function(o){ c[o.k]=(c[o.k]||0)+1; });
  var big=it.filter(function(o){ return o.x && !has(SMALL,o.x); }), hit=big.filter(function(o){ return o.k==="="||o.k==="near"||o.k==="fam"; }).length;
  function out(t,d,n){ return {t:t, d:d||"", n:n, it:it}; }
  if(c.known) return out("mixup");
  if(c.miss && !hit && !it.some(function(o){ return o.k==="="; })) return out("other");
  if(c.miss || c.cut) return out("part");
  if(c.junk || c.no) return near(aj,gj) ? out("spell",subtype(aj,gj),dist(aj,gj)) : out("other");
  if(c.fam) return out("form");
  if(c.extra) return out("other");
  if(c.near){ var b=it.filter(function(o){ return o.k==="near"; }); return out("spell", b.length===1?subtype(b[0].x,b[0].y):"mix", b.reduce(function(m,o){ return m+o.n; },0)); }
  if((c.fmiss||0)+(c.fextra||0)+(c.swap||0)) return out("func", c.swap?"fswap":c.fmiss?"fmiss":"fextra");
  return out("other");
}

/* 回傳 {ok, t 類型, d 細分, n 差幾個字母, low 句中多寫了大寫, it 片語逐字比對} */
C.classify = function(ans, got){
  ans=C.norm(ans); got=C.norm(got);
  if(got===ans) return {ok:true, t:"", d:""};
  var a=ans.toLowerCase(), g=got.toLowerCase(), r;
  if(!g) return {ok:false, t:"part", d:""};
  if(a===g){
    /* 該大寫的都有大寫，只是多寫了大寫 → 算對，只提醒 */
    for(var i=0;i<ans.length;i++) if(ans[i]!==a[i] && got[i]===g[i]) return {ok:false, t:"caps", d:""};
    return {ok:true, t:"", d:"", low:true};
  }
  if(g.length<=2 && a.length>=3 && a.indexOf(g)===0 && !sameFamily(a,g)) return {ok:false, t:"part", d:""};
  if(/[^a-z' \-]/.test(g)) return {ok:false, t:"other", d:""};
  if(a.indexOf(" ")>0){ r=phrase(a,g); r.ok=false; return r; }
  if(sameFamily(a,g)) return {ok:false, t:"form", d:""};
  if(has(KNOWN,g)) return {ok:false, t:"mixup", d:""};
  if(a.indexOf(g)===0 && a.length-g.length>=3) return {ok:false, t:"part", d:""};
  var k=dist(a,g), lim=Math.max(1, Math.floor(a.length*0.4));
  if(a.length>=4 && a.slice(0,2)===g.slice(0,2)) lim++;            /* 開頭兩個字母對了就寬一格，收照發音拼的 coff */
  if(k<=lim || (a.length>=4 && subtype(a,g)==="order")) return {ok:false, t:"spell", d:subtype(a,g), n:k};
  return {ok:false, t:"other", d:""};
};

/* 第一次答錯時給學生的提示：講哪一種錯，不直接給答案 */
function spellTip(d,n){
  if(d==="miss")  return "少了 "+n+" 個字母";
  if(d==="extra") return "多了 "+n+" 個字母";
  if(d==="order") return "字母都找對了，順序要換一下";
  if(d==="vowel") return "母音（a、e、i、o、u）再檢查一次";
  if(d==="dbl")   return "看看哪個字母要寫兩次，或不用寫兩次";
  return "還有 "+n+" 個地方要改";
}
C.third = function(q){ return q.p.indexOf("第三人稱")>=0; };
C.startsSentence = function(q){ var b=q.s.split("___")[0].trim(); return !b || /[.?!]$/.test(b); };
C.mean = function(q){ return q.zh+"　"+q.p; };
function phraseTip(q,got,r){
  var say=[], small=false;
  if(r.t==="func" && r.d==="forder") return "字都找對了，順序要換一下。";
  if(r.d==="space") return "字母都對了，檢查字和字中間的空格。";
  (r.it||[]).forEach(function(o){
    var nth="第 "+(o.i+1)+" 個字";
    if(o.k==="near") say.push(nth+"很接近，"+spellTip(subtype(o.x,o.y),o.n));
    else if(o.k==="fam") say.push(nth+"的字尾要變化"+(C.third(q)?"，主詞是 he、she 或一個人":"，看看主詞是誰"));
    else if(o.k==="known") say.push("「"+o.y+"」是另一個字");
    else if(o.k==="cut") say.push(nth+"還沒寫完");
    else if(o.k==="miss") say.push("少了一個字");
    else if(o.k==="extra") say.push("多了一個字");
    else if(o.k==="junk"||o.k==="no") say.push(nth+"再想一下");
    else if(!small && /^(fmiss|fextra|swap)$/.test(o.k)){
      small=true;
      say.push(o.k==="fmiss"?"少了一個小字（像 a、the、to、by、my）":o.k==="fextra"?"多了一個小字，拿掉看看":"有一個小字要換掉（像 by、on、a、the、my、his）");
    }
  });
  var good=(r.t==="func"||r.t==="form") ? "意思找對了！" : "";
  return good+(say.slice(0,2).join("；")||"再看一次")+"。";
}
C.coach = function(q, got, r){
  if(q.a.indexOf(" ")>0 && r.t!=="caps" && (r.it || r.d==="space" || r.d==="forder")) return phraseTip(q,got,r);
  switch(r.t){
    case "spell": return (r.d==="order" ? "" : "很接近！")+spellTip(r.d, r.n||1)+"。";
    case "form":
      if(q.p.indexOf("過去式")>=0) return "意思找對了！這句在講過去的事，要用過去式。";
      if(C.third(q)) return "意思找對了！主詞是 he、she 或一個人，動詞字尾要變化。";
      return "意思找對了！看看句子，這裡的字尾要不要變化。";
    case "mixup": return "「"+got+"」是另一個字，意思不一樣。可以按「中文」提示。";
    case "caps":  return C.startsSentence(q) ? "拼對了！句子的第一個字母要大寫。" : "拼對了！有字母要大寫，國家、星期、TV 這類字要注意。";
    case "part":  return "還沒寫完，總共有 "+C.letters(q.a)+" 個字母。";
    default:      return "還差蠻多的，先按提示再想想看。";
  }
};
C.letters = function(s){ return (s.match(/[A-Za-z]/g)||[]).length; };

/* 逐字母比對：回傳 [{a,g,op}]，op 是 = 對、~ 寫錯、- 少寫、+ 多寫 */
C.align = function(ans, got){
  var a=C.norm(ans), g=C.norm(got), m=a.length, n=g.length, d=[], i, j;
  for(i=0;i<=m;i++) d[i]=[i];
  for(j=0;j<=n;j++) d[0][j]=j;
  for(i=1;i<=m;i++) for(j=1;j<=n;j++)
    d[i][j]=Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+(a[i-1]===g[j-1]?0:1));
  var out=[]; i=m; j=n;
  while(i>0||j>0){
    if(i>0&&j>0&&d[i][j]===d[i-1][j-1]+(a[i-1]===g[j-1]?0:1)){
      out.unshift({a:a[i-1], g:g[j-1], op:a[i-1]===g[j-1]?"=":"~"}); i--; j--;
    } else if(i>0&&d[i][j]===d[i-1][j]+1){ out.unshift({a:a[i-1], g:"", op:"-"}); i--; }
    else { out.unshift({a:"", g:g[j-1], op:"+"}); j--; }
  }
  return out;
};

/* ---------- 小工具 ---------- */
C.el = function(tag, attrs, kids){
  var e=document.createElement(tag), k;
  for(k in (attrs||{})){
    var v=attrs[k];
    if(v==null || v===false) continue;
    if(k==="class") e.className=v;
    else if(k==="text") e.textContent=v;
    else if(k.slice(0,2)==="on") e[k]=v;
    else if(k==="style") e.style.cssText=v;
    else e.setAttribute(k, v===true?"":v);
  }
  [].concat(kids==null?[]:kids).forEach(function(c){
    if(c==null||c===false) return;
    e.appendChild(typeof c==="object" ? c : document.createTextNode(String(c)));
  });
  return e;
};
C.store = function(k,v){
  try{
    if(v===undefined) return localStorage.getItem(k);
    if(v===null){ localStorage.removeItem(k); return null; }
    localStorage.setItem(k,v);
  }catch(e){ return null; }
};
C.shuffle = function(arr, rnd){
  var a=arr.slice(), r=rnd||Math.random;
  for(var i=a.length-1;i>0;i--){ var j=Math.floor(r()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
};
C.part = function(id){ return ((E&&E.parts)||[]).filter(function(x){ return x.id===id; })[0] || {id:id,zh:"",name:""}; };
C.byId = {}; ((E&&E.bank)||[]).forEach(function(q){ C.byId[q.id]=q; });
C.unit = function(id){ return ((E&&E.units)||[]).filter(function(u){ return u.id===id; })[0] || {id:id,name:id,zh:""}; };
C.fill = function(q){ return q.s.replace("___", q.a); };

/* ---------- 朗讀 ---------- */
C.canSpeak = function(){ return typeof speechSynthesis!=="undefined" && typeof SpeechSynthesisUtterance!=="undefined"; };
C.speak = function(text, rate){
  if(!C.canSpeak()) return false;
  try{
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(text); u.lang="en-US"; u.rate=rate||0.85;
    var vs=speechSynthesis.getVoices().filter(function(v){ return /^en[-_]/i.test(v.lang); });
    var pick=vs.filter(function(v){ return /Samantha|Google US English|Jenny|Aria|Ava/i.test(v.name); })[0]
          || vs.filter(function(v){ return /en[-_]US/i.test(v.lang); })[0] || vs[0];
    if(pick) u.voice=pick;
    speechSynthesis.speak(u); return true;
  }catch(e){ return false; }
};

/* ---------- Firebase ---------- */
var SDK="https://www.gstatic.com/firebasejs/10.12.2/";
function loadScript(src){
  return new Promise(function(res,rej){
    var s=document.createElement("script"); s.src=src; s.onload=res;
    s.onerror=function(){ rej(new Error(src)); }; document.head.appendChild(s);
  });
}
C.firebase = async function(withAuth){
  await loadScript(SDK+"firebase-app-compat.js");
  if(withAuth) await loadScript(SDK+"firebase-auth-compat.js");
  await loadScript(SDK+"firebase-firestore-compat.js");
  firebase.initializeApp(E.firebase);
  return {db:firebase.firestore(), auth:withAuth?firebase.auth():null};
};

root.ENGC = C;
if(typeof module!=="undefined" && module.exports) module.exports=C;
})(typeof window!=="undefined"?window:globalThis);
