"use strict";
const EXAMPLE = `StudyMethod,ExamOutcome
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Pass
Individual,Fail
Individual,Fail
Individual,Fail
Group,Pass
Group,Pass
Group,Pass
Group,Pass
Group,Pass
Group,Pass
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Group,Fail
Tutor,Pass
Tutor,Pass
Tutor,Pass
Tutor,Pass
Tutor,Pass
Tutor,Pass
Tutor,Pass
Tutor,Pass
Tutor,Pass
Tutor,Pass
Tutor,Pass
Tutor,Fail`;
const input=document.getElementById("dataInput"); let comparisonChart,conditionalChart;
input.value=EXAMPLE;
function loadDefaultExample(){input.value=EXAMPLE;document.getElementById("hasHeader").checked=true;document.getElementById("delimiter").value="auto";document.getElementById("alpha").value="0.05";analyze();}
document.getElementById("loadExample").addEventListener("click",loadDefaultExample);
document.getElementById("analyze").addEventListener("click",analyze);
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function detectDelimiter(line){const choices=[",",";","\t"];return choices.sort((a,b)=>(line.split(b).length-line.split(a).length))[0];}
function parseData(){const lines=input.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(lines.length<2)throw new Error("Enter at least two non-empty rows.");let d=document.getElementById("delimiter").value;if(d==="tab")d="\t";if(d==="auto")d=detectDelimiter(lines[0]);const rows=lines.map((line,i)=>{const parts=line.split(d).map(x=>x.trim());if(parts.length!==2||parts.some(x=>x===""))throw new Error(`Row ${i+1} must contain exactly two non-empty values.`);return parts;});let names=["X","F"];if(document.getElementById("hasHeader").checked)names=rows.shift();if(rows.length===0)throw new Error("No observations remain after the header.");return{names,rows};}
function unique(a){return [...new Set(a)];}
function buildAnalysis(rows){const xs=unique(rows.map(r=>r[0])),fs=unique(rows.map(r=>r[1]));if(xs.length<2||fs.length<2)throw new Error("Each variable needs at least two observed categories for a chi-square independence test.");const xi=new Map(xs.map((x,i)=>[x,i])),fi=new Map(fs.map((x,i)=>[x,i]));const observed=xs.map(()=>fs.map(()=>0));rows.forEach(([x,f])=>observed[xi.get(x)][fi.get(f)]++);const rowTotals=observed.map(r=>r.reduce((a,b)=>a+b,0));const colTotals=fs.map((_,j)=>observed.reduce((s,r)=>s+r[j],0));const n=rows.length;const expected=observed.map((r,i)=>r.map((_,j)=>rowTotals[i]*colTotals[j]/n));const contributions=observed.map((r,i)=>r.map((o,j)=>(o-expected[i][j])**2/expected[i][j]));const chi2=contributions.flat().reduce((a,b)=>a+b,0),df=(xs.length-1)*(fs.length-1),p=chiSquareSurvival(chi2,df);return{xs,fs,observed,rowTotals,colTotals,n,expected,contributions,chi2,df,p};}
function matrixTable(titleRows,titleCols,matrix,rowTotals,colTotals,total,formatter=x=>x){let h=`<table><thead><tr><th>${esc(titleRows)} \\ ${esc(titleCols)}</th>${titleCols?matrix[0].map((_,j)=>`<th>${esc(titleCols[j]??"")}</th>`).join(""):""}<th>Total</th></tr></thead><tbody>`;h= h.replace(matrix[0].map(()=>"").join(""),"");return h;}
function renderTable(a,matrix,fmt,includeTotals=true){let h=`<table><thead><tr><th>${esc(a.names[0])} \\ ${esc(a.names[1])}</th>${a.fs.map(f=>`<th>${esc(f)}</th>`).join("")}${includeTotals?"<th>Total</th>":""}</tr></thead><tbody>`;a.xs.forEach((x,i)=>{h+=`<tr><th>${esc(x)}</th>${matrix[i].map(v=>`<td>${fmt(v)}</td>`).join("")}${includeTotals?`<td>${fmt(a.rowTotals[i])}</td>`:""}</tr>`;});if(includeTotals)h+=`<tr><th>Total</th>${a.colTotals.map(v=>`<td>${fmt(v)}</td>`).join("")}<td>${fmt(a.n)}</td></tr>`;return h+"</tbody></table>";}
function analyze(){const msg=document.getElementById("inputMessage");try{const parsed=parseData(),a=buildAnalysis(parsed.rows);a.names=parsed.names;msg.textContent=`Read ${a.n} observations, ${a.xs.length} X categories and ${a.fs.length} F categories.`;render(a);}catch(e){msg.textContent=e.message;document.getElementById("decision").innerHTML=`<div class="result bad"><strong>Input error:</strong> ${esc(e.message)}</div>`;}}
function render(a){const alpha=Number(document.getElementById("alpha").value),reject=a.p<alpha;const small=a.expected.flat().filter(x=>x<5).length,totalCells=a.expected.flat().length,minExpected=Math.min(...a.expected.flat());document.getElementById("metrics").innerHTML=`<div class="metric"><b>${a.n}</b>observations</div><div class="metric"><b>${a.chi2.toFixed(4)}</b>χ² statistic</div><div class="metric"><b>${a.df}</b>degrees of freedom</div><div class="metric"><b>${formatP(a.p)}</b>p-value</div><div class="metric"><b>${minExpected.toFixed(2)}</b>minimum expected</div>`;let assumption=minExpected<1||small/totalCells>.2?` The usual chi-square approximation may be unreliable: ${small} of ${totalCells} expected counts are below 5 and the minimum is ${minExpected.toFixed(2)}.`:" The expected-frequency guideline is satisfied.";document.getElementById("decision").innerHTML=`<div class="result ${reject?"bad":"good"}"><strong>Decision at α=${alpha}:</strong> ${reject?"Reject H₀. The data provide evidence that the variables are statistically associated (dependent).":"Do not reject H₀. The data do not provide sufficient evidence of dependence; this does not prove independence."}${assumption}<br><strong>Causality:</strong> this test measures association only and cannot establish that either variable causes the other.</div>`;
document.getElementById("observedTable").innerHTML=renderTable(a,a.observed,x=>x.toString(),true);const relative=a.observed.map(r=>r.map(x=>x/a.n));document.getElementById("relativeTable").innerHTML=renderTable({...a,rowTotals:a.rowTotals.map(x=>x/a.n),colTotals:a.colTotals.map(x=>x/a.n),n:1},relative,pct,true);const rowCond=a.observed.map((r,i)=>r.map(x=>x/a.rowTotals[i]));document.getElementById("rowConditionalTable").innerHTML=renderTable({...a,rowTotals:a.rowTotals.map(()=>1),colTotals:a.fs.map(()=>NaN),n:NaN},rowCond,pct,false);const colCond=a.observed.map(r=>r.map((x,j)=>x/a.colTotals[j]));document.getElementById("columnConditionalTable").innerHTML=renderTable({...a},colCond,pct,false);document.getElementById("expectedTable").innerHTML=renderTable(a,a.expected,x=>x.toFixed(3),false);document.getElementById("contributionTable").innerHTML=renderTable(a,a.contributions,x=>x.toFixed(4),false);drawCharts(a,rowCond);}
function pct(x){return Number.isFinite(x)?(100*x).toFixed(2)+"%":"";}function formatP(p){return p<.0001?"< 0.0001":p.toFixed(6);}
function drawCharts(a,rowCond){if(comparisonChart)comparisonChart.destroy();if(conditionalChart)conditionalChart.destroy();const labels=[];a.xs.forEach((x,i)=>a.fs.forEach((f,j)=>labels.push(`${x} / ${f}`)));comparisonChart=new Chart(document.getElementById("comparisonChart"),{type:"bar",data:{labels,datasets:[{label:"Observed",data:a.observed.flat(),backgroundColor:"#2457a6"},{label:"Expected under H₀",data:a.expected.flat(),backgroundColor:"#f29e4c"}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}});conditionalChart=new Chart(document.getElementById("conditionalChart"),{type:"bar",data:{labels:a.fs,datasets:a.xs.map((x,i)=>({label:`${a.names[0]}=${x}`,data:rowCond[i].map(v=>100*v)}))},options:{responsive:true,scales:{x:{stacked:false},y:{beginAtZero:true,max:100,title:{display:true,text:"Percent within X category"}}}}});}
// Numerical Recipes-style regularized gamma functions. For chi-square, p=Q(df/2, chi2/2).
function logGamma(z){const c=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);z-=1;let x=.9999999999998099;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);const t=z+c.length-.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);}
function gammaP(a,x){if(x<=0)return 0;if(x>=a+1)return 1-gammaQcf(a,x);let sum=1/a,term=sum,ap=a;for(let n=1;n<=1000;n++){ap++;term*=x/ap;sum+=term;if(Math.abs(term)<Math.abs(sum)*1e-14)break;}return sum*Math.exp(-x+a*Math.log(x)-logGamma(a));}
function gammaQcf(a,x){let b=x+1-a,c=1/1e-300,d=1/b,h=d;for(let i=1;i<=1000;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-14)break;}return Math.exp(-x+a*Math.log(x)-logGamma(a))*h;}
function chiSquareSurvival(x,df){if(x<0||df<=0)return NaN;const a=df/2,z=x/2;return Math.max(0,Math.min(1,z<a+1?1-gammaP(a,z):gammaQcf(a,z)));}
loadDefaultExample();
