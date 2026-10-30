const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const targets = ['src','tests'];
const errors = [];

function inspect(directory) {
  for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name);
    if (entry.isDirectory()) { inspect(file); continue; }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    const input=fs.readFileSync(file,'utf8');
    const scanner=ts.createScanner(ts.ScriptTarget.Latest,false,ts.LanguageVariant.Standard,input);
    let kind=scanner.scan();
    while(kind!==ts.SyntaxKind.EndOfFileToken){
      if(kind===ts.SyntaxKind.SingleLineCommentTrivia||kind===ts.SyntaxKind.MultiLineCommentTrivia){
        const line=ts.computeLineAndCharacterOfPosition(ts.computeLineStarts(input),scanner.getTokenPos()).line+1;
        errors.push(`${file}:${line} comentário encontrado`);
      }
      kind=scanner.scan();
    }
    const source=ts.createSourceFile(file,input,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    function visit(node){
      if(node.kind===ts.SyntaxKind.AnyKeyword||node.kind===ts.SyntaxKind.DebuggerStatement){
        const line=source.getLineAndCharacterOfPosition(node.getStart(source)).line+1;
        errors.push(`${file}:${line} tipo any ou debugger encontrado`);
      }
      ts.forEachChild(node,visit);
    }
    visit(source);
  }
}

for(const directory of targets)inspect(directory);
if(errors.length){for(const error of errors)console.error(error);process.exitCode=1;}
else console.log('Lint básico aprovado: sem comentários, any explícito ou debugger.');
