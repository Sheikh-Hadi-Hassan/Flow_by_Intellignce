import { detectAskLanguage, type AskLanguageDetection } from "../language";

export type AnswerLanguage = "en" | "ur" | "ur_roman" | "ar";

export type PhraseParams = Record<string, string | number>;

type PhraseTable = Record<AnswerLanguage, string>;

/**
 * Presentation-only answer frames. The English column is the canonical
 * output and is pinned by unit/e2e suites; other columns localize the
 * connective copy only. Business values (names, references, amounts,
 * currency codes) arrive as params and are never translated.
 */
const PHRASES: Record<string, PhraseTable> = {
  "summary.decisions": {
    en: "{count} decision{plural} need you",
    ur: "آپ کے {count} فیصلے زیرِ التوا ہیں",
    ur_roman: "Aap ke {count} faisly zair-e-intezar hain",
    ar: "لديك {count} قرارات بانتظارك",
  },
  "summary.nothing": {
    en: "Nothing is waiting on you",
    ur: "آپ کے لیے کوئی فیصلہ زیرِ التوا نہیں",
    ur_roman: "Aap ke liye koi faisla zair-e-intezar nahi",
    ar: "لا توجد قرارات بانتظارك",
  },
  "summary.exposed": {
    en: "and {exposure} is exposed",
    ur: "اور {exposure} زیرِ خطرہ ہے",
    ur_roman: "aur {exposure} khatray mein hai",
    ar: "ومبلغ {exposure} معرّض للخطر",
  },
  "summary.greet": {
    en: "Hello. {status} I can pull sales, projects, invoices, or approvals from this workspace.",
    ur: "السلام علیکم۔ {status} میں اس ورک اسپیس سے سیلز، پروجیکٹس، انوائسز یا اپروولز نکال سکتا ہوں۔",
    ur_roman:
      "Hello! {status} Main is workspace se sales, projects, invoices ya approvals nikal sakta hoon.",
    ar: "مرحباً. {status} يمكنني استعراض المبيعات أو المشاريع أو الفواتير أو الموافقات من مساحة العمل هذه.",
  },
  "sales.today": {
    en: "Today's sales update as of {asOf}.",
    ur: "آج کی سیلز اپڈیٹ، وقت {asOf}۔",
    ur_roman: "Aaj ki sales update, waqt {asOf}.",
    ar: "تحديث مبيعات اليوم حتى {asOf}.",
  },
  "sales.noEvents": {
    en: "No CRM events are timestamped for today.",
    ur: "آج کے لیے کوئی CRM ایونٹ ٹائم اسٹیمپ نہیں ہے۔",
    ur_roman: "Aaj ke liye koi CRM event timestamp nahi hai.",
    ar: "لا توجد أحداث CRM مؤرخة اليوم.",
  },
  "sales.pipeline": {
    en: "Pipeline is {total} across {stages}.",
    ur: "پائپ لائن {total} ہے، مراحل: {stages}۔",
    ur_roman: "Pipeline {total} hai, stages: {stages}.",
    ar: "الـ Pipeline بقيمة {total} عبر المراحل: {stages}.",
  },
  "sales.new": {
    en: "New discovery/brief opportunities: {count}.",
    ur: "نئے ڈسکوری/بریف مواقع: {count}۔",
    ur_roman: "Naye discovery/brief opportunities: {count}.",
    ar: "فرص جديدة (استكشاف/موجز): {count}.",
  },
  "sales.won": {
    en: "Won or executed: {count}.",
    ur: "جیتے گئے یا مکمل: {count}۔",
    ur_roman: "Jeetay gaye ya mukammal: {count}.",
    ar: "تم الفوز بها أو تنفيذها: {count}.",
  },
  "sales.followups": {
    en: "Follow-ups: {list}.",
    ur: "فالو اپس: {list}۔",
    ur_roman: "Follow-ups: {list}.",
    ar: "المتابعات: {list}.",
  },
  "common.none": {
    en: "none",
    ur: "کوئی نہیں",
    ur_roman: "koi nahi",
    ar: "لا شيء",
  },
  "projects.none": {
    en: "No projects match that view.",
    ur: "اس منظر سے کوئی پروجیکٹ میچ نہیں ہوتا۔",
    ur_roman: "Is view se koi project match nahi hota.",
    ar: "لا توجد مشاريع تطابق هذا العرض.",
  },
  "projects.count": {
    en: "{count} projects.",
    ur: "{count} پروجیکٹس۔",
    ur_roman: "{count} projects.",
    ar: "{count} مشاريع.",
  },
  "projects.urgent": {
    en: "Most urgent first.",
    ur: "سب سے فوری پہلے۔",
    ur_roman: "Sab se foran pehle.",
    ar: "الأكثر إلحاحاً أولاً.",
  },
  "projects.risks": {
    en: " Risks: {list}",
    ur: " خطرات: {list}",
    ur_roman: " Risks: {list}",
    ar: " المخاطر: {list}",
  },
  "projects.row": {
    en: "{name} ({client}): {status}, {health}, {due}, {value}",
    ur: "{name} ({client}): {status}، {health}، {due}، {value}",
    ur_roman: "{name} ({client}): {status}, {health}, {due}, {value}",
    ar: "{name} ({client}): {status}، {health}، {due}، {value}",
  },
  "payment.none": {
    en: "No clients show worsening payment behaviour in the current ledger.",
    ur: "کسی کلائنٹ کی ادائیگی میں خرابی نہیں دکھائی دیتی۔",
    ur_roman: "Kisi client ki payment mein kharabi nahi dikhai deti.",
    ar: "لا يوجد عملاء يتدهور سلوكهم في السداد حالياً.",
  },
  "payment.header": {
    en: "Clients with worsening payment behaviour, {period}.",
    ur: "ادائیگی کے رویے میں خرابی والے کلائنٹس، {period}۔",
    ur_roman: "Clients jin ki payment behaviour kharab ho rahi hai, {period}.",
    ar: "عملاء يتدهور سلوكهم في السداد، {period}.",
  },
  "payment.also": {
    en: " Also: {terms}",
    ur: " مزید: {terms}",
    ur_roman: " Also: {terms}",
    ar: " أيضاً: {terms}",
  },
  "payment.row": {
    en: "{client}: {amount} overdue, {days} days ({change}; {period})",
    ur: "{client}: {amount} واجب الادا، {days} دن ({change}؛ {period})",
    ur_roman: "{client}: {amount} overdue, {days} din ({change}; {period})",
    ar: "{client}: {amount} متأخرة، {days} يوماً ({change}؛ {period})",
  },
  "invoices.none": {
    en: "No invoices are overdue in this workspace.",
    ur: "اس ورک اسپیس میں کوئی انوائس واجب الادا نہیں ہے۔",
    ur_roman: "Is workspace mein koi invoice overdue nahi hai.",
    ar: "لا توجد فواتير متأخرة في مساحة العمل هذه.",
  },
  "invoices.count": {
    en: "{count} overdue invoices totalling {total}: {list}.",
    ur: "{count} انوائسز واجب الادا، کل {total}: {list}۔",
    ur_roman: "{count} overdue invoices, total {total}: {list}.",
    ar: "{count} فواتير متأخرة بإجمالي {total}: {list}.",
  },
  "invoices.row": {
    en: "{client} {reference} {amount} ({days} days)",
    ur: "{client} {reference} {amount} ({days} دن)",
    ur_roman: "{client} {reference} {amount} ({days} din)",
    ar: "{client} {reference} {amount} ({days} يوماً)",
  },
  "pipeline.summary": {
    en: "Pipeline {total} across {count} opportunities: {stages}.",
    ur: "پائپ لائن {total}، {count} مواقع کے ساتھ: {stages}۔",
    ur_roman: "Pipeline {total}, {count} opportunities ke saath: {stages}.",
    ar: "الـ Pipeline بقيمة {total} عبر {count} فرص: {stages}.",
  },
  "pipeline.row": {
    en: "{label} {count} / {value}",
    ur: "{label} {count} / {value}",
    ur_roman: "{label} {count} / {value}",
    ar: "{label} {count} / {value}",
  },
  "approvals.none": {
    en: "Nothing needs your approval. The founder queue is empty.",
    ur: "آپ کی منظوری کے لیے کچھ بھی زیرِ التوا نہیں۔ بانی کی قطار خالی ہے۔",
    ur_roman:
      "Aap ki manzoori ke liye kuch bhi pending nahi. Founder queue khali hai.",
    ar: "لا يوجد شيء بانتظار موافقتك. قائمة المؤسس فارغة.",
  },
  "approvals.count": {
    en: "{count} pending approval{plural}: {list}",
    ur: "{count} منظوریاں زیرِ التوا: {list}",
    ur_roman: "{count} approvals pending: {list}",
    ar: "{count} موافقات بانتظارك: {list}",
  },
  "approvals.row": {
    en: "{title} ({client}, {urgency})",
    ur: "{title} ({client}، {urgency})",
    ur_roman: "{title} ({client}, {urgency})",
    ar: "{title} ({client}، {urgency})",
  },
  "capacity.none": {
    en: "No capacity records are available in this workspace.",
    ur: "اس ورک اسپیس میں کوئی کیپیسٹی ریکارڈ موجود نہیں۔",
    ur_roman: "Is workspace mein koi capacity record maujood nahi.",
    ar: "لا توجد بيانات سعة في مساحة العمل هذه.",
  },
  "capacity.deadline": {
    en: "Protecting the deadline: {name} can take the Vantage review this week. Margin on that path stays at the current 38% until you reopen pricing.",
    ur: "ڈیڈ لائن بچانے کے لیے: {name} اس ہفتے Vantage ریویو سنبھال سکتا ہے۔ اسی راستے پر مارجن موجودہ 38% پر ہی رہے گا جب تک آپ قیمت دوبارہ نہ کھولیں۔",
    ur_roman:
      "Deadline bachane ke liye: {name} is hafte Vantage review sambhal sakta hai. Margin us raaste par current 38% par hi rahega jab tak aap pricing dobara na kholen.",
    ar: "لحماية الموعد النهائي: يمكن لـ{name} تولي مراجعة Vantage هذا الأسبوع. يبقى هامش الربح على هذا المسار عند 38% الحالية حتى تعيد فتح التسعير.",
  },
  "capacity.margin": {
    en: "Protecting margin: keep {name} on the review and slip the Vantage checkpoint by four days. That avoids overtime against the floor.",
    ur: "مارجن بچانے کے لیے: {name} کو ریویو پر رکھیں اور Vantage چیک پوائنٹ چار دن آگے کر دیں۔ اس سے ریٹ فلور کے خلاف اوور ٹائم نہیں لگے گا۔",
    ur_roman:
      "Margin bachane ke liye: {name} ko review par rakhein aur Vantage checkpoint chaar din aage kar dein. Is se rate floor ke khilaf overtime nahi lagega.",
    ar: "لحماية هامش الربح: أبقِ {name} على المراجعة وأجّل نقطة تفتيش Vantage أربعة أيام. هذا يجنّب العمل الإضافي مقابل الحد الأدنى للأسعار.",
  },
  "capacity.row": {
    en: "{name} {utilization}: {note}",
    ur: "{name} {utilization}: {note}",
    ur_roman: "{name} {utilization}: {note}",
    ar: "{name} {utilization}: {note}",
  },
  "exposure.none": {
    en: "Nothing is exposed. This workspace has no open founder decisions.",
    ur: "کچھ بھی زیرِ خطرہ نہیں۔ اس ورک اسپیس میں کوئی اوپن بانی فیصلہ نہیں ہے۔",
    ur_roman:
      "Kuch bhi exposed nahi. Is workspace mein koi open founder decision nahi hai.",
    ar: "لا يوجد مبلغ معرّض للخطر. لا توجد قرارات مؤسس مفتوحة في مساحة العمل هذه.",
  },
  "exposure.count": {
    en: "{count} open decision{plural} hold {exposure}: {list}",
    ur: "{count} اوپن فیصلے {exposure} روکے ہوئے ہیں: {list}",
    ur_roman: "{count} open decisions {exposure} roke hue hain: {list}",
    ar: "{count} قرارات مفتوحة تحتجز {exposure}: {list}",
  },
  "exposure.row": {
    en: "{client}: {title}",
    ur: "{client}: {title}",
    ur_roman: "{client}: {title}",
    ar: "{client}: {title}",
  },
  "search.matches": {
    en: "Matches: {list}.",
    ur: "ملاپ: {list}۔",
    ur_roman: "Matches: {list}.",
    ar: "النتائج المطابقة: {list}.",
  },
  "client360.summary": {
    en: "{name} is {stage}, owned by {owner}. Health {health}. Last interaction {last}.",
    ur: "{name} {stage} میں ہے، انچارج {owner}۔ ہیلتھ {health}۔ آخری رابطہ {last}۔",
    ur_roman:
      "{name} {stage} mein hai, incharge {owner}. Health {health}. Aakhri rabta {last}.",
    ar: "{name} في مرحلة {stage}، ومسؤولها {owner}. الصحة {health}. آخر تفاعل {last}.",
  },
  "clients.none": {
    en: "No clients in that segment.",
    ur: "اس سیگمنٹ میں کوئی کلائنٹ نہیں۔",
    ur_roman: "Is segment mein koi client nahi.",
    ar: "لا يوجد عملاء في هذه الفئة.",
  },
  "clients.count": {
    en: "{count} verified clients.",
    ur: "{count} تصدیق شدہ کلائنٹس۔",
    ur_roman: "{count} verified clients.",
    ar: "{count} من العملاء الموثقين.",
  },
  "clients.empty": {
    en: "No clients are available in this workspace.",
    ur: "اس ورک اسپیس میں کوئی کلائنٹ دستیاب نہیں۔",
    ur_roman: "Is workspace mein koi client dastiyab nahi.",
    ar: "لا يوجد عملاء متاحون في مساحة العمل هذه.",
  },
  "duplicates.found": {
    en: "Duplicate candidate {pair} scored {score}. {reason}",
    ur: "ممکنہ ڈوبلیکیٹ {pair}، اسکور {score}۔ {reason}",
    ur_roman: "Possible duplicate {pair}, score {score}. {reason}",
    ar: "مرشح مكرر محتمل {pair} بدرجة {score}. {reason}",
  },
  "propose.note": {
    en: "Proposed. A founder must approve before records change.",
    ur: "تجویز کردہ۔ ریکارڈ تبدیل ہونے سے پہلے کسی بانی کی منظوری ضروری ہے۔",
    ur_roman:
      "Proposed. Records badalne se pehle kisi founder ki manzoori zaroori hai.",
    ar: "مقترح. يجب موافقة المؤسس قبل تغيير السجلات.",
  },
  "propose.noteCompany": {
    en: "Proposed. A founder must approve before the company record changes.",
    ur: "تجویز کردہ۔ کمپنی ریکارڈ تبدیل ہونے سے پہلے کسی بانی کی منظوری ضروری ہے۔",
    ur_roman:
      "Proposed. Company record badalne se pehle kisi founder ki manzoori zaroori hai.",
    ar: "مقترح. يجب موافقة المؤسس قبل تغيير سجل الشركة.",
  },
  "registry.profile": {
    en: "{fictional} {legalName} trades as {tradingName}. Canonical organisation {organizationId} ({demoKey}). {structure}",
    ur: "{fictional} {legalName} بطور {tradingName} کام کرتی ہے۔ مرکزی آرگنائزیشن {organizationId} ({demoKey})۔ {structure}",
    ur_roman:
      "{fictional} {legalName} as {tradingName} kaam karti hai. Canonical organization {organizationId} ({demoKey}). {structure}",
    ar: "{fictional} تعمل {legalName} باسم {tradingName}. المؤسسة الرسمية {organizationId} ({demoKey}). {structure}",
  },
  "registry.registration": {
    en: "{fictional} {legalName} is registered as {registrationNumber} in {jurisdiction}. Principal office: {office}.",
    ur: "{fictional} {legalName} {jurisdiction} میں {registrationNumber} کے تحت رجسٹرڈ ہے۔ مرکزی دفتر: {office}۔",
    ur_roman:
      "{fictional} {legalName} {jurisdiction} mein {registrationNumber} ke under registered hai. Principal office: {office}.",
    ar: "{fictional} {legalName} مسجلة في {jurisdiction} برقم {registrationNumber}. المكتب الرئيسي: {office}.",
  },
  "registry.locations": {
    en: "{fictional} {locations}.",
    ur: "{fictional} {locations}۔",
    ur_roman: "{fictional} {locations}.",
    ar: "{fictional} {locations}.",
  },
  "registry.locationRow": {
    en: "{name} in {city} ({timezone}{primary})",
    ur: "{name}، {city} ({timezone}{primary})",
    ur_roman: "{name}, {city} ({timezone}{primary})",
    ar: "{name}، {city} ({timezone}{primary})",
  },
  "registry.firmographics": {
    en: "{fictional} {industry}. Declared employee target {employeeTarget}; computed actual: {employeeActual}. Revenue band {revenueBand}.",
    ur: "{fictional} {industry}۔ اعلان کردہ ملازمین کا ہدف {employeeTarget}؛ حسابی اصل: {employeeActual}۔ ریونیو بینڈ {revenueBand}۔",
    ur_roman:
      "{fictional} {industry}. Declared employee target {employeeTarget}; computed actual: {employeeActual}. Revenue band {revenueBand}.",
    ar: "{fictional} {industry}. هدف الموظفين المعلن {employeeTarget}؛ الفعلي المحسوب: {employeeActual}. نطاق الإيرادات {revenueBand}.",
  },
  "registry.signatories": {
    en: "{fictional} Authorised signatories: {list}.",
    ur: "{fictional} مجاز دستخط کرنے والے: {list}۔",
    ur_roman: "{fictional} Authorised signatories: {list}.",
    ar: "{fictional} الموقّعون المفوضون: {list}.",
  },
  "registry.signatoryRow": {
    en: "{name}, {title}: {authority}",
    ur: "{name}، {title}: {authority}",
    ur_roman: "{name}, {title}: {authority}",
    ar: "{name}، {title}: {authority}",
  },
  "registry.documents": {
    en: "{fictional} Documents needing renewal: {list}.",
    ur: "{fictional} تجدید کے لیے دستاویزات: {list}۔",
    ur_roman: "{fictional} Documents needing renewal: {list}.",
    ar: "{fictional} مستندات تحتاج تجديداً: {list}.",
  },
  "registry.documentRow": {
    en: "{title} {reference} ({expiry}, {urgency}, owner {owner})",
    ur: "{title} {reference} ({expiry}، {urgency}، مالک {owner})",
    ur_roman: "{title} {reference} ({expiry}, {urgency}, owner {owner})",
    ar: "{title} {reference} ({expiry}، {urgency}، المسؤول {owner})",
  },
  "fallback.unknown": {
    en: "I could not summarize that result. Try asking differently.",
    ur: "میں یہ نتیجہ خلاصہ نہیں کر سکا۔ دوسرے انداز میں پوچھیں۔",
    ur_roman:
      "Main yeh natija khulasa nahi kar saka. Doosray andaz mein poochein.",
    ar: "لم أتمكن من تلخيص هذه النتيجة. جرّب صياغة أخرى للسؤال.",
  },
  "reason.adversarial": {
    en: "I can't help with that. Ask about workspace records instead.",
    ur: "میں اس میں مدد نہیں کر سکتا۔ ورک اسپیس ریکارڈز کے بارے میں پوچھیں۔",
    ur_roman:
      "Main is mein madad nahi kar sakta. Workspace records ke baare mein poochein.",
    ar: "لا أستطيع المساعدة في ذلك. اسأل عن سجلات مساحة العمل بدلاً من ذلك.",
  },
  "reason.greeting": {
    en: "I'm here to help with workspace records. Try asking about invoices, projects, or clients.",
    ur: "میں ورک اسپیس ریکارڈز میں مدد کے لیے حاضر ہوں۔ انوائسز، پروجیکٹس یا کلائنٹس کے بارے میں پوچھیں۔",
    ur_roman:
      "Main workspace records mein madad ke liye haazir hoon. Invoices, projects ya clients ke baare mein poochein.",
    ar: "أنا هنا لمساعدتك مع سجلات مساحة العمل. اسأل عن الفواتير أو المشاريع أو العملاء.",
  },
  "reason.incomplete": {
    en: "I need a bit more detail. What would you like me to look up?",
    ur: "مجھے تھوڑی مزید تفصیل چاہیے۔ آپ کیا دیکھنا چاہتے ہیں؟",
    ur_roman: "Mujhe thori mazeed tafseel chahiye. Aap kya dekhna chahte hain?",
    ar: "أحتاج مزيداً من التفاصيل. ماذا تريد أن أستعرض؟",
  },
  "reason.outside": {
    en: "I can answer workspace status, sales, projects, invoices, pipeline, approvals, capacity, or exposure. That question is outside those records.",
    ur: "میں ورک اسپیس اسٹیٹس، سیلز، پروجیکٹس، انوائسز، پائپ لائن، اپروولز، کیپیسٹی یا ایکسپوژر کے بارے میں جواب دے سکتا ہوں۔ یہ سوال ان ریکارڈز سے باہر ہے۔",
    ur_roman:
      "Main workspace status, sales, projects, invoices, pipeline, approvals, capacity ya exposure ke baare mein jawab de sakta hoon. Yeh sawaal un records se bahar hai.",
    ar: "أستطيع الإجابة عن حالة مساحة العمل والمبيعات والمشاريع والفواتير وخط الفرص والموافقات والسعة والمبالغ المعرّضة للخطر. هذا السؤال خارج تلك السجلات.",
  },
  "clarify.foundFew": {
    en: "I found a few things I could do. Which did you mean?",
    ur: "میں چند چیزیں کر سکتا ہوں۔ آپ کی مراد کیا تھی؟",
    ur_roman: "Main kuch cheezein kar sakta hoon. Aap ki murad kya thi?",
    ar: "يمكنني القيام بعدة أمور. أيّها تقصد؟",
  },
  "clarify.multiIntent": {
    en: "I spotted more than one request. Which should I handle first?",
    ur: "مجھے ایک سے زیادہ درخواستیں نظر آئیں۔ پہلے کون سی سنبھالوں؟",
    ur_roman:
      "Mujhe aik se zyada requests nazar aayeen. Pehle kaun si sambhaloon?",
    ar: "لاحظت أكثر من طلب. أيّها أنفّذ أولاً؟",
  },
  "clarify.writeRisk": {
    en: "That looks like a write request. Which proposal did you mean?",
    ur: "یہ ایک تبدیلی کی درخواست لگتی ہے۔ آپ کی مراد کون سی تجویز تھی؟",
    ur_roman:
      "Yeh aik tabdeeli ki request lagti hai. Aap ki murad kaun si proposal thi?",
    ar: "يبدو أن هذا طلب تعديل. أي عرض تقصد؟",
  },
  "clarify.verbObject": {
    en: "What would you like me to {verb}?",
    ur: "آپ چاہتے ہیں کہ میں {verb} کے ساتھ کیا کروں؟",
    ur_roman: "Aap chahte hain main {verb} ke saath kya karoon?",
    ar: "ماذا تريد أن أفعل بـ {verb}؟",
  },
  "clarify.objectOnly": {
    en: "What would you like to do with {obj}?",
    ur: "آپ {obj} کے ساتھ کیا کرنا چاہتے ہیں؟",
    ur_roman: "Aap {obj} ke saath kya karna chahte hain?",
    ar: "ماذا تريد أن تفعل بـ {obj}؟",
  },
  "clarify.rephrase": {
    en: "Could you rephrase that?",
    ur: "کیا آپ اسے دوبارہ بیان کر سکتے ہیں؟",
    ur_roman: "Kya aap ise dobara bayaan kar sakte hain?",
    ar: "هل يمكنك إعادة صياغة السؤال؟",
  },
  "error.runtimeUnavailable": {
    en: "The Business Language Model runtime is unavailable in this session. Your question was kept. Retry when the runtime is back.",
    ur: "اس سیشن میں بزنس لینگویج ماڈل دستیاب نہیں ہے۔ آپ کا سوال محفوظ ہے۔ رن ٹائم واپس آنے پر دوبارہ کوشش کریں۔",
    ur_roman:
      "Is session mein Business Language Model available nahi hai. Aap ka sawaal mehfooz hai. Runtime wapis aane par dobara koshish karein.",
    ar: "محرك نموذج اللغة غير متاح في هذه الجلسة. تم حفظ سؤالك. أعد المحاولة عند عودة الخدمة.",
  },
  "error.toolUnavailable": {
    en: "I could not retrieve authoritative records for that. Your question was kept. Retry or pick another view.",
    ur: "مجھے اس کے مستند ریکارڈز نہیں مل سکے۔ آپ کا سوال محفوظ ہے۔ دوبارہ کوشش کریں یا کوئی اور منظر منتخب کریں۔",
    ur_roman:
      "Mujhe is ke authoritative records nahi mil sake. Aap ka sawaal mehfooz hai. Dobara koshish karein ya koi doosra view chunein.",
    ar: "لم أتمكن من استرجاع السجلات الموثوقة. تم حفظ سؤالك. أعد المحاولة أو اختر عرضاً آخر.",
  },
};

const PLACEHOLDER = /\{(\w+)\}/g;

export function tPhrase(
  key: string,
  language: AnswerLanguage = "en",
  params: PhraseParams = {},
): string {
  const table = PHRASES[key];
  if (!table) return "";
  const template = table[language] ?? table.en;
  return template.replace(PLACEHOLDER, (_, name: string) =>
    params[name] === undefined ? "" : String(params[name]),
  );
}

export function answerLanguageOf(
  detection: AskLanguageDetection,
): AnswerLanguage {
  if (detection.language === "en") return "en";
  if (detection.language === "ar") return "ar";
  if (detection.language === "ur") {
    return detection.script === "latin" ? "ur_roman" : "ur";
  }
  return "ur_roman";
}

export function detectAnswerLanguage(
  message: string,
  localeHint?: string,
): AnswerLanguage {
  return answerLanguageOf(detectAskLanguage(message, localeHint));
}

export function phraseKeys(): readonly string[] {
  return Object.keys(PHRASES);
}

export function phraseColumns(key: string): PhraseTable | undefined {
  return PHRASES[key];
}
