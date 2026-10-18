// Personnel records belong to the school system. Use their live position and
// academic rank instead of keeping a second roster in the evaluation app.
export function eligibleForEvaluation(person, kind) {
 const position = String(person.position ?? '').trim();
 if (!/^ครู/.test(position)) return false;
 if (kind === 'pa') return true;
 if (kind !== 'assistant') return false;

 const rank = String(person.academic_rank ?? '').replace(/\s+/g, '').trim();
 const designation = (rank + position).replace(/\s+/g, '');
 // A rank written in either field must take precedence over a blank rank.
 if (/ชำนาญการ|เชี่ยวชาญ|ทรงคุณวุฒิ|ค\.?ศ\.?[2-9]/.test(designation)) return false;
 // A blank rank is the common representation of a teacher without academic
 // standing (including assistant teachers) in the school personnel registry.
 if (!rank || /^(?:ไม่มีวิทยฐานะ|ไม่มี|ครู|ครูผู้ช่วย|คศ\.?1|ค\.ศ\.?1)$/.test(rank)) return true;
 return false; // An unfamiliar rank must be corrected in the school registry.
}
