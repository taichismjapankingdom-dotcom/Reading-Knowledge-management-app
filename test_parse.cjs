const { marked } = require('marked');
const rawJSON = `"\n\n### **IT戦略 VS DX戦略**\n    **短絡的**\n    **important**\n    IT戦略・・・keyword 「改善」\n\n    既存業務の効率化が主。\n    \n    e.g.) 業務システム（e.g. CRM, SFA, ERP）導入・改善、業務用デバイスを配布→時間や場所に縛られない形態\n"`;
const text = JSON.parse(rawJSON);
console.log(marked.parse(text));
