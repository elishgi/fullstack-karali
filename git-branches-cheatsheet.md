# 🧠 Git Branches - Cheat Sheet

מדריך קצר לעבודה עם ענפים (Branches) ב-Git

---

## ✅ מתי ליצור ענף חדש?
- אתה מפתח פיצ'ר חדש
- עושה שינוי גדול במבנה הקוד
- עובד על משהו שייקח יותר מ־20 דקות
- בודק רעיון נסיוני
- עובד בצוות

---

## 🛠 פקודות חשובות

### יצירת ענף חדש ולעבור אליו:
```
git checkout -b feature/branch-name
```

### מעבר בין ענפים:
```
git checkout main
```

### לראות את כל הענפים:
```
git branch
```

### מחיקת ענף מקומי (אחרי שאוחד):
```
git branch -d feature/branch-name
```

---

## 🧩 תהליך מלא לפיתוח פיצ'ר:

1. מעבר לענף חדש:
```
git checkout -b feature/my-feature
```

2. עבודה רגילה:
```
git add .
git commit -m "פיתוח פיצ'ר חדש"
git push -u origin feature/my-feature
```

3. לאחר סיום: חזרה ל-main ואיחוד:
```
git checkout main
git pull
git merge feature/my-feature
git push
```

4. (אופציונלי) מחיקת הענף:
```
git branch -d feature/my-feature
```

---

## 👀 טיפים חשובים

- שמור על `main` נקי ויציב
- כל פיצ'ר → ענף משלו
- בצוות: כל אחד עובד על ענף משלו ומבצע Pull Request
- תמיד תעשה `git pull` לפני `merge` כדי לוודא שאין קונפליקטים

---

בהצלחה 🤘
