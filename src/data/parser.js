import fs from 'fs';

const data = fs.readFileSync('src/data/data.txt', 'utf-8');
const lines = data.split('\n');

let currentMonthStr = '08';
let currentYearStr = '2024';
let currentDate = '2024-08-01';
let currentRemarks = 'PAK';
const parsedData = [];

const monthMap = {
  'جنوری': '01', 'january': '01', 'jan': '01',
  'فروری': '02', 'february': '02', 'feb': '02',
  'march': '03', 'مارچ': '03', 'mar': '03',
  'april': '04', 'اپریل': '04', 'apr': '04',
  'may': '05', 'مئی': '05',
  'june': '06', 'جون': '06', 'jun': '06',
  'july': '07', 'جولائی': '07', 'jul': '07',
  'august': '08', 'aug': '08', 'اگست': '08',
  'september': '09', 'sept': '09', 'ستمبر': '09',
  'october': '10', 'oct': '10', 'اکتوبر': '10',
  'november': '11', 'nov': '11', 'نومبر': '11',
  'december': '12', 'dec': '12', 'دسمبر': '12'
};

function determineDateAndRemarks(line) {
  let date = currentDate;
  let remarks = 'PAK';
  let title = line.toLowerCase();
  
  if (title.includes('ksa') || title.includes('سعودی عرب') || title.includes('riyadh')) {
    remarks = 'KSA';
  } else if (title.includes('dubai') || title.includes('دوبئ')) {
    remarks = 'DUBAI';
  } else if (title.includes('oman') || title.includes('عمان')) {
    remarks = 'OMAN';
  } else if (title.includes('qatar')) {
    remarks = 'QATAR';
  } else if (title.includes('islamabad') || title.includes('pindi') || title.includes('karachi') || title.includes('sindh') || title.includes('pakistan') || title.includes('پاکستان')) {
    remarks = 'PAK';
  }
  
  let m = '';
  let y = '';
  
  if (title.includes('2024')) y = '2024';
  else if (title.includes('2025')) y = '2025';
  else if (title.includes('2026')) y = '2026';
  
  for (let key in monthMap) {
    if (title.includes(key)) {
      m = monthMap[key];
      break;
    }
  }
  
  if (title.includes('دفتر فرنیچر') || title.includes('فطرہ/حدیہ فہرست  2025') || title.includes('ramadan pkg 2025')) {
    m = '03'; 
    y = '2025';
  }
  if (title.includes('emergency medical donation special appeal')) {
      if (title.includes('5th may 2025')) { m = '05'; y = '2025'; }
      else if (title.includes('may,june,july,aug')) { m = '06'; y = '2025'; }
      else if (title.includes('sept,nov,dec')) { m = '10'; y = '2025'; }
      else if (title.includes('oct 2025')) { m = '10'; y = '2025'; }
      else if (title.includes('nov 2025')) { m = '11'; y = '2025'; }
      else if (title.includes('dec 2025')) { m = '12'; y = '2025'; }
      else if (title.includes('may 2025')) { m = '05'; y = '2025'; }
  }
  if (title.includes('ramadan ul mubarak package 2026')) {
      m = '03';
      y = '2026';
  }
  
  if (y && !m) {
      m = currentMonthStr;
  } else if (m && !y) {
      y = currentYearStr;
  } else if (!m && !y) {
      return null;
  }
  
  currentYearStr = y;
  currentMonthStr = m;
  
  return { date: `${y}-${m}-01`, remarks };
}

let txCounter = 1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  if (!line.match(/^\d+/) && !line.includes('نمبرشمار') && !line.includes('S#') && !line.includes('TOTAL') && !line.includes('ٹوٹل')) {
      let res = determineDateAndRemarks(line);
      if (res) {
          currentDate = res.date;
          currentRemarks = res.remarks;
          txCounter = 1;
      }
  }
  
  const parts = line.split(/\t+/);
  if (parts.length >= 4) {
    let sNo = parts[0].trim();
    if (sNo.match(/^\d+$/)) {
       const name = parts[1].trim();
       let country = parts[2].trim();
       
       let remarks = currentRemarks;
       if (country.includes('دوبئ') || country.toUpperCase().includes('DUBAI')) {
           remarks = 'DUBAI';
       } else if (country.includes('عمان') || country.toUpperCase().includes('OMAN')) {
           remarks = 'OMAN';
       } else if (country.toUpperCase().includes('QATAR')) {
           remarks = 'QATAR';
       } else if (country.includes('سعودی عرب') || country.toUpperCase() === 'KSA') {
           remarks = 'KSA';
       } else if (country.includes('پاکستان') || country.toUpperCase() === 'PAK' || country.toUpperCase() === 'PAKISTAN') {
           remarks = 'PAK';
       }
       
       const address = parts[3].trim().toUpperCase() || '';
       
       let amountStr = '';
       if (parts.length >= 5) {
           amountStr = parts[4].trim().replace(/,/g, '');
       } else if (parts.length === 4) {
           amountStr = address;
       }
       
       let amount = parseInt(amountStr);
       
       if (!isNaN(amount) && amount > 0) {
           let monthCode = currentDate.substring(0, 7).replace('-', '');
           let txId = `TX-${monthCode}-${txCounter.toString().padStart(3, '0')}`;
           txCounter++;
           
           parsedData.push(`  { id: 'don-bulk-${monthCode}-${txCounter}', Date: '${currentDate}', 'Donor Name': '${name.replace(/'/g, "\\'")}', 'NIC No': '', 'Contact No': '', 'Permanent Address': '${address.replace(/'/g, "\\'")}', Profession: '', Amount: ${amount}, 'Transaction ID': '${txId}', Remarks: '${remarks}', EnteredBy: 'Admin', Status: 'Approved' }`);
       }
    }
  }
}

let initialDataContent = fs.readFileSync('src/data/initialData.ts', 'utf-8');
const splitStr = '];\n\nexport const INITIAL_BENEFICIARIES';
const parts = initialDataContent.split(splitStr);

if (parts.length === 2) {
    const newDataString = ',\n\n  // Auto-imported bulk data\n' + parsedData.join(',\n') + '\n';
    const finalContent = parts[0] + newDataString + splitStr + parts[1];
    fs.writeFileSync('src/data/initialData.ts', finalContent);
    console.log('Successfully injected ' + parsedData.length + ' records into initialData.ts');
} else {
    console.error('Could not find split point in initialData.ts');
}
