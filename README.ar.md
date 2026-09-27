# DevFlow Pro

[![رخصة: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

منصة شاملة لزيادة إنتاجية المطورين تجمع كل الأدوات التي تحتاجها في مكان واحد. DevFlow Pro يمتد DevFlow Lite بـ7 ميزات قوية مصممة لتبسيط سير عمل التطوير الخاص بك.

## الميزات

- **مديم الأكواد**: حفظ، تنظيم، والبحث عن أجزاء الكود الخاص بك مع تمييز الصياغة ودعم ماركداون.
- **متعقب الأخطاء**: تتبع الأخطاء مع مستويات الأهمية والفئات، وتمثيل الإحصائيات بالرسوم البيانية.
- **لوحة كانبان للسباقات**: واجهة سحب وإفلات للتخطيط السريع مع تتبع السرعة.
- **متعقب مزاج الفريق**: مراقبة معنويات الفريق مع التحقق اليومي وتحليل اتجاهات المزاج.
- **مجدد الوثائق**: البحث عن وتعليق وثائق المكتبات/الواجهات البرمجية مع تكامل مجموعة الأدوات المحاكاة.
- **مراقب CI/CD**: تتبع حالات البناء عبر المشاريع مع التحديثات الفورية والتنبيهات.
- **قاعدة المعرفة**: إنشاء وتنظيم مقالات المعرفة بدعم ماركداون والبحث النصي.

## التقنية المستخدمة

- **الواجهة الأمامية**: Next.js 16, React 18, TypeScript
- **التصميم**: Tailwind CSS 3 مع الوضع المظلم
- **الرسوم البيانية**: Recharts
- **السحب والإفلات**: @hello-pangea/dnd
- **ماركداون**: marked
- **الأيقونات**: Lucide React
- **التواريخ**: date-fns
- **الصوت**: Web Audio API

## البداية السريعة

1. استنسخ المستودع
bash
git clone https://github.com/yourusername/devflow-pro-app.git
cd devflow-pro-app


2. قم بتثبيت الاعتماديات
bash
npm install


3. شغل خادم التطوير
bash
npm run dev


4. افتح [http://localhost:3000](http://localhost:3000) في متصفحك

## البنية

يتبع DevFlow Pro نمط البنية المفردة حيث تكون كل المكونات، الأدوات، وإدارة الحالة داخل `src/app/page.tsx`. هذا النهض يضمن البساطة وقابلية الصيانة مع توفير تجربة تطوير كاملة.

- **إدارة الحالة**: useState من React مع حفظ البيانات في localStorage
- **لوحة الأوامر**: اختصارات لوحة المفاتيح العامة (Cmd/Ctrl+K)
- **إشعارات التطبيق**: نظام إشعارات مخصص مع تنبيهات صوتية
- **الوضع المظلم**: تبديل الموضوع مع الوعي بالنظام

## حفظ البيانات

تخزن جميع البيانات في localStorage تحت مفتاح "devflow-pro" مع وظيفة الحفظ التلقائي. يمكنك تصدير/استيراد بياناتك عبر شاشة الإعدادات.

## المساهمة

المساهمات مرحب بها! يرجى قراءة [دليل المساهمة](CONTRIBUTING.md) لمعرفة التفاصيل حول سلوكنا عملية تقديم طلبات السحب.

## الرخصة

هذا المشروع مرخصة برخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## الشكر

- مبنية بـ [Next.js](https://nextjs.org/)
- مصممة بـ [Tailwind CSS](https://tailwindcss.com/)
- الرسوم البيانية بواسطة [Recharts](https://recharts.org/)
- الأيقونات من [Lucide](https://lucide.dev/)

---

صنع بـ ❤️ من قبل فريق DevFlow