// DRAFTS — have a lawyer review before launch. Contact: daria.dxns@gmail.com
const UPDATED_EN = 'Last updated: November 2026 · Draft';
const UPDATED_HE = 'עודכן לאחרונה: נובמבר 2026 · טיוטה';
const MAIL = 'daria.dxns@gmail.com';

export const LEGAL = {
  en: {
    privacy: {
      title: 'Privacy policy',
      updated: UPDATED_EN,
      sections: [
        { p: ['Kartis lets you design a printed contact card and download it as a PDF. We collect as little as we can.'] },
        { h: 'What stays in your browser', p: ['Everything you type into the card editor (name, phone, email, handles, address, the QR link) is kept only in your own browser, so your draft is still there when you come back. It is not sent to us. The PDF is made on your device. You can clear it at any time by clearing this site’s data in your browser.'] },
        { h: 'What we collect', p: ['If you join the “Draft with AI” waiting list, we store your email address, the language of the page and the date, so we can write to you once the feature opens. We use it for nothing else, and we do not sell or share it.', 'Our hosting provider (Vercel) keeps standard server logs, such as IP address and browser type, for security and to keep the site running.', 'We count visits with Vercel Web Analytics. It uses no cookies and does not identify you: it records the page, the country, the device type and a few steps in the editor (for example, that a PDF was downloaded), never what you type on your card.'] },
        { h: 'Third parties', p: ['Fonts are served by Google Fonts, which receives your IP address when a page loads. “Find a print shop” opens Google Maps in a new tab, under Google’s own privacy policy. The waiting list is stored in Google Sheets.'] },
        { h: 'Your rights', p: ['You can ask to see, correct or delete your email address at any time: write to ' + MAIL + '. Under the Israeli Privacy Protection Law you may also contact the Privacy Protection Authority.'] },
        { h: 'Contact', p: [MAIL] }
      ]
    },
    terms: {
      title: 'Terms of use',
      updated: UPDATED_EN,
      sections: [
        { p: ['By using Kartis you agree to these terms. If you do not agree, please do not use the site.'] },
        { h: 'The service', p: ['Kartis is a free tool for designing contact cards and downloading them as print-ready PDFs. It is offered as is, without warranties. We may change or pause it at any time.'] },
        { h: 'Your content', p: ['You are responsible for what you put on your card, including the link in the QR code. Do not use Kartis for anything unlawful, misleading or that infringes someone else’s rights. Your card designs are yours.'] },
        { h: 'Printing', p: ['Check your PDF and a proof before printing. Colours, paper and cutting depend on the print shop; we are not responsible for printing results or print costs.'] },
        { h: 'Our designs', p: ['The templates, illustrations and site design belong to Kartis. You may use them to print cards for personal use. Fonts are used under the SIL Open Font License.'] },
        { h: 'Liability', p: ['To the extent the law allows, Kartis is not liable for indirect damages arising from use of the site.'] },
        { h: 'Law', p: ['These terms are governed by the laws of the State of Israel. Courts in Tel Aviv have jurisdiction.'] },
        { h: 'Contact', p: [MAIL] }
      ]
    },
    accessibility: {
      title: 'Accessibility statement',
      updated: UPDATED_EN,
      sections: [
        { p: ['We want everyone to be able to make a card with Kartis. The site is built to follow the Israeli standard IS 5568, based on WCAG 2.0 level AA.'] },
        { h: 'What we did', p: ['Real buttons, links and form fields that work with a keyboard and screen readers. Labels on every field and clear error messages. Text contrast of at least 4.5:1. Touch targets of at least 44 px. Pages that work on phones and when zoomed to 200%. Motion is reduced when your device asks for it. Hebrew pages read right to left.'] },
        { h: 'Known limits', p: ['The card preview is a picture of your card; everything on it is also in the form fields next to it. The “Take a journey” animation is decorative.'] },
        { h: 'Contact our accessibility coordinator', p: ['If something does not work for you, write to Daria at ' + MAIL + '. We will answer within 7 days.'] }
      ]
    }
  },
  he: {
    privacy: {
      title: 'מדיניות פרטיות',
      updated: UPDATED_HE,
      sections: [
        { p: ['Kartis מאפשר לעצב כרטיס איש קשר מודפס ולהוריד אותו כקובץ PDF. אנחנו אוספים כמה שפחות מידע.'] },
        { h: 'מה נשאר בדפדפן שלכם', p: ['כל מה שאתם מקלידים בעורך הכרטיס (שם, טלפון, אימייל, שמות משתמש, כתובת וקישור ה־QR) נשמר רק בדפדפן שלכם, כדי שהטיוטה תחכה לכם כשתחזרו. המידע לא נשלח אלינו. קובץ ה־PDF נוצר במכשיר שלכם. אפשר למחוק את המידע בכל עת על ידי ניקוי נתוני האתר בדפדפן.'] },
        { h: 'מה אנחנו אוספים', p: ['אם נרשמתם לרשימת ההמתנה של „טיוטה עם AI”, אנחנו שומרים את כתובת האימייל, את שפת העמוד ואת התאריך, כדי לכתוב לכם כשהאפשרות תיפתח. איננו משתמשים בה לשום מטרה אחרת, ואיננו מוכרים או מעבירים אותה.', 'ספקית האחסון שלנו (Vercel) שומרת יומני שרת רגילים, כמו כתובת IP וסוג הדפדפן, לצורכי אבטחה ותפעול.', 'אנחנו סופרים ביקורים בעזרת Vercel Web Analytics. הכלי לא משתמש בעוגיות ולא מזהה אתכם: הוא רושם את העמוד, המדינה, סוג המכשיר וכמה שלבים בעורך (למשל, שהורד PDF), ולעולם לא את מה שכתבתם בכרטיס.'] },
        { h: 'צדדים שלישיים', p: ['הגופנים מוגשים על ידי Google Fonts, שמקבלת את כתובת ה־IP שלכם בטעינת העמוד. „מציאת בית דפוס” פותח את Google Maps בלשונית חדשה, לפי מדיניות הפרטיות של Google. רשימת ההמתנה נשמרת ב־Google Sheets.'] },
        { h: 'הזכויות שלכם', p: ['אפשר לבקש בכל עת לעיין בכתובת האימייל, לתקן או למחוק אותה: כתבו אל ' + MAIL + '. לפי חוק הגנת הפרטיות אפשר גם לפנות לרשות להגנת הפרטיות.'] },
        { h: 'יצירת קשר', p: [MAIL] }
      ]
    },
    terms: {
      title: 'תנאי שימוש',
      updated: UPDATED_HE,
      sections: [
        { p: ['השימוש ב־Kartis מהווה הסכמה לתנאים אלה. אם אינכם מסכימים, אנא אל תשתמשו באתר.'] },
        { h: 'השירות', p: ['Kartis הוא כלי חינמי לעיצוב כרטיסי איש קשר ולהורדתם כקובצי PDF מוכנים לדפוס. השירות ניתן כמות שהוא (AS IS), ללא אחריות. אנחנו רשאים לשנות או להשהות אותו בכל עת.'] },
        { h: 'התוכן שלכם', p: ['אתם אחראים למה שמופיע בכרטיס שלכם, כולל הקישור בקוד ה־QR. אין להשתמש ב־Kartis לכל מטרה בלתי חוקית, מטעה או כזו שפוגעת בזכויות של אחרים. העיצובים של הכרטיסים שלכם שייכים לכם.'] },
        { h: 'הדפסה', p: ['בדקו את קובץ ה־PDF והגהה לפני ההדפסה. צבעים, נייר וחיתוך תלויים בבית הדפוס; איננו אחראים לתוצאות ההדפסה או לעלותה.'] },
        { h: 'העיצובים שלנו', p: ['התבניות, האיורים ועיצוב האתר שייכים ל־Kartis. מותר להשתמש בהם להדפסת כרטיסים לשימוש אישי. הגופנים בשימוש לפי רישיון SIL Open Font License.'] },
        { h: 'אחריות', p: ['ככל שהחוק מתיר, Kartis אינו אחראי לנזקים עקיפים הנובעים מהשימוש באתר.'] },
        { h: 'דין וסמכות שיפוט', p: ['על תנאים אלה חלים דיני מדינת ישראל. סמכות השיפוט נתונה לבתי המשפט בתל אביב.'] },
        { h: 'יצירת קשר', p: [MAIL] }
      ]
    },
    accessibility: {
      title: 'הצהרת נגישות',
      updated: UPDATED_HE,
      sections: [
        { p: ['אנחנו רוצים שכל אחד יוכל ליצור כרטיס עם Kartis. האתר נבנה בהתאם לתקן הישראלי ת״י 5568, המבוסס על הנחיות WCAG 2.0 ברמה AA.'] },
        { h: 'מה עשינו', p: ['כפתורים, קישורים ושדות טופס אמיתיים שעובדים עם מקלדת וקורא מסך. תוויות לכל שדה והודעות שגיאה ברורות. ניגודיות טקסט של 4.5:1 לפחות. אזורי לחיצה של 44 פיקסלים לפחות. עמודים שעובדים בטלפון ובהגדלה של 200%. צמצום תנועה כשהמכשיר מבקש זאת. עמודים בעברית נקראים מימין לשמאל.'] },
        { h: 'מגבלות ידועות', p: ['התצוגה המקדימה של הכרטיס היא תמונה; כל מה שמופיע בה נמצא גם בשדות הטופס לצידה. האנימציה „יוצאים למסע” היא קישוטית.'] },
        { h: 'פנייה לרכזת הנגישות', p: ['אם משהו לא עובד עבורכם, כתבו לדריה בכתובת ' + MAIL + '. נשיב תוך 7 ימים.'] }
      ]
    }
  }
};
