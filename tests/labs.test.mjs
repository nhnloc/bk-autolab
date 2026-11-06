import { LABS, solutionProject, starterProject, loadSolutions } from '../src/labs/index.js';
if (!(await loadSolutions())) { console.log('Không có private/solutions.js — bỏ qua kiểm thử lời giải'); process.exit(0); }
import { gradeLab } from '../src/labs/grader.js';
let bad = 0;
const only = process.argv[2];
for (const lab of LABS) {
  if (only && lab.id !== only) continue;
  const r = await gradeLab(lab, solutionProject(lab));
  const st = r.stats || {};
  console.log(`${lab.id.padEnd(5)} ${lab.machineId.padEnd(11)} ${String(r.score).padStart(3)}/100  produced=${st.produced} defects=${st.defects} crashes=${st.crashes} rej=${st.rejected}`);
  for (const c of r.checks) if (!c.pass) console.log('     ✗', c.label, '|', c.detail.replace(/\n/g, ' | '));
  if (r.score < 100) bad++;
  const s = await gradeLab(lab, starterProject(lab));
  if (s.score > 20) { console.log('     starter scored too high:', s.score); bad++; }
}
process.exit(bad ? 1 : 0);
