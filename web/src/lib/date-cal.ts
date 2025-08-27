export const strip = (d:Date)=> new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const firstOfMonth = (y:number, m:number)=> new Date(y, m, 1);
export const addMonths = (d:Date, n:number)=> new Date(d.getFullYear(), d.getMonth()+n, 1);

export function buildWeeks(anchor: Date) {
  // anchor はその月の1日を推奨
  const start = new Date(anchor);
  start.setDate(1);
  const firstDow = (start.getDay() + 6) % 7; // 月=0, …, 日=6
  const begin = new Date(start);
  begin.setDate(start.getDate() - firstDow);

  const weeks: Date[][] = [];
  let cur = new Date(begin);
  for (let w=0; w<6; w++) {
    const row: Date[] = [];
    for (let d=0; d<7; d++) {
      row.push(new Date(cur));
      cur.setDate(cur.getDate()+1);
    }
    weeks.push(row);
  }
  return weeks;
}

