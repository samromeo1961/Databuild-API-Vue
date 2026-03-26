const fs = require('fs');

const templatePath = 'C:\\Dev\\Databuild-API-Vue\\src\\templates\\purchase-orders\\default\\classic-po.hbs';
const content = fs.readFileSync(templatePath, 'utf8');
const lines = content.split('\n');

let stack = [];

lines.forEach((line, index) => {
  const lineNum = index + 1;

  // Find all opening block helpers
  const openMatches = line.matchAll(/{{#(\w+)/g);
  for (const match of openMatches) {
    stack.push({ line: lineNum, type: match[1], content: line.trim() });
  }

  // Find all closing blocks
  const closeMatches = line.matchAll(/{{\/(\w+)}}/g);
  for (const match of closeMatches) {
    if (stack.length > 0) {
      const last = stack[stack.length - 1];
      if (last.type === match[1]) {
        stack.pop();
      } else {
        console.log(`Line ${lineNum}: Closing {{/${match[1]}}} doesn't match opening {{#${last.type}}} from line ${last.line}`);
      }
    } else {
      console.log(`Line ${lineNum}: Closing {{/${match[1]}}} without opening`);
    }
  }
});

if (stack.length > 0) {
  console.log('\n UNCLOSED BLOCKS:');
  stack.forEach(item => {
    console.log(`Line ${item.line}: {{#${item.type}}} - ${item.content}`);
  });
  console.log(`\nTotal unclosed: ${stack.length}`);
} else {
  console.log('✓ All blocks are properly closed!');
}
