const lucene = require('lucene');
const q = 'title:Gatsby AND NOT author:Fitzgerald';
console.log(JSON.stringify(lucene.parse(q), null, 2));
