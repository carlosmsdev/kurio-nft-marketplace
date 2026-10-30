import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.AUDIT_URL || 'http://127.0.0.1:4173';
const pages = [{name:'inicio',url:base+'/'},{name:'detalhe',url:base+'/nft/1'}];
const categories = ['performance','accessibility','best-practices','seo'];
const directory = 'reports/lighthouse';
mkdirSync(directory,{recursive:true});
const results = [];
const median = values => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
for (const page of pages) {
    for (const device of ['mobile','desktop']) {
        const runs = [];
        for (let index=1;index<=3;index++) {
            const target = join(directory,`${page.name}-${device}-${index}`);
            const args=['--yes','lighthouse',page.url,'--quiet','--chrome-flags=--headless --no-sandbox','--no-enable-error-reporting','--output=json','--output=html',`--output-path=${target}`];
            if (device==='desktop') args.push('--preset=desktop');
            console.log(`Auditando ${page.name} / ${device} (${index}/3)`);
            const exit = spawnSync('npx',args,{stdio:'inherit',encoding:'utf8'});
            if (exit.status !== 0) {console.error('Falha na auditoria. Inicie npm run preview no endereço 127.0.0.1:4173.');process.exit(1);}
            const report = JSON.parse(readFileSync(`${target}.report.json`,'utf8'));
            runs.push({
                scores:Object.fromEntries(categories.map(key=>[key,Math.round((report.categories[key]?.score??0)*100)])),
                lcpMs:report.audits['largest-contentful-paint']?.numericValue??null,
                cls:report.audits['cumulative-layout-shift']?.numericValue??null,
                tbtMs:report.audits['total-blocking-time']?.numericValue??null,
                lighthouseVersion:report.lighthouseVersion,
                userAgent:report.userAgent,
                fetchTime:report.fetchTime,
            });
        }
        const scores=Object.fromEntries(categories.map(key=>[key,median(runs.map(row=>row.scores[key]))]));
        const quality={performance:90,accessibility:95,'best-practices':95,seo:90};
        results.push({page:page.name,device,url:page.url,medianScores:scores,targets:quality,
            meetsTargets:categories.every(key=>scores[key]>=quality[key]),
            metrics:{lcpMs:median(runs.map(row=>row.lcpMs)),cls:median(runs.map(row=>row.cls)),tbtMs:median(runs.map(row=>row.tbtMs))},runs});
    }
}
writeFileSync(join(directory,'summary.json'),JSON.stringify({node:process.version,date:new Date().toISOString(),results},null,2));
const lines=['# Auditoria Lighthouse','',`Data: ${new Date().toISOString()}`,'',`Node.js: ${process.version}`,'', '| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP ms | CLS | TBT ms | Metas |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---|'];
for(const row of results){const s=row.medianScores,m=row.metrics;lines.push(`| ${row.page} | ${row.device} | ${s.performance} | ${s.accessibility} | ${s['best-practices']} | ${s.seo} | ${m.lcpMs?.toFixed(0)??'—'} | ${m.cls?.toFixed(3)??'—'} | ${m.tbtMs?.toFixed(0)??'—'} | ${row.meetsTargets?'Aprovado':'Abaixo da meta'} |`);}
lines.push('','Cada valor é a mediana de três medições independentes. Relatórios HTML e JSON individuais estão nesta pasta.');
writeFileSync(join(directory,'summary.md'),lines.join('\n'));
console.table(results.map(row=>({page:row.page,device:row.device,...row.medianScores,...row.metrics,meetsTargets:row.meetsTargets})));
