import{readFile,writeFile,mkdir,copyFile}from'node:fs/promises';
import{fileURLToPath}from'node:url';import{dirname,join}from'node:path';
const root=dirname(fileURLToPath(import.meta.url));const art={};
for(const name of ['corridor','sewing','radio','roof','desk']){try{art[name]='data:image/jpeg;base64,'+(await readFile(join(root,'assets',name+'.jpg'))).toString('base64')}catch(e){if(name!=='desk')throw e}}
let html=await readFile(join(root,'template.html'),'utf8');
html=html.replace('%%font%%',(await readFile(join(root,'assets/fonts/rain-hand.woff2'))).toString('base64')).replace('%%font_license%%',await readFile(join(root,'assets/fonts/OFL.txt'),'utf8'));
for(const name of ['audio','objects','game']){let src=await readFile(join(root,name+'.js'),'utf8');if(name==='game')src=src.replace('%%assets%%',JSON.stringify(art));html=html.replace('%%'+name+'%%',src)}
if(/%%\w+%%/.test(html))throw Error('Missing template input');await mkdir(join(root,'dist'),{recursive:true});await writeFile(join(root,'dist','index.html'),html);await writeFile(join(root,'dist','隔窗有雨.html'),html);await writeFile(join(root,'dist','雨停之前-沉浸版.html'),html);await copyFile(join(root,'assets','corridor.jpg'),join(root,'dist','cover.jpg'));console.log(JSON.stringify({bytes:Buffer.byteLength(html),file:join(root,'dist','隔窗有雨.html')}));
