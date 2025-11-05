import React from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const Section = ({ icon, title, description, items }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={22} color="#3DD6D0" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <Text style={styles.sectionDescription}>{description}</Text>
    {Array.isArray(items) && items.length > 0 && (
      <View style={styles.sectionList}>
        {items.map((item, index) => (
          <View key={index} style={styles.sectionListItem}>
            <Ionicons name="ellipse" size={8} color="#3DD6D0" style={styles.sectionBullet} />
            <Text style={styles.sectionListText}>{item}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

const HelpGuideScreen = () => {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require('../../assets/images/background2.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="חזרה למסך הקודם"
          >
            <Ionicons name="chevron-back" size={22} color="#1b1b1b" />
            <Text style={styles.backText}>חזרה</Text>
          </TouchableOpacity>

          <View style={styles.headerTexts}>
            <Text style={styles.title}>מדריך שימוש באפליקציה</Text>
            <Text style={styles.subtitle}>הכירו את הסיפור, המטרה והאפשרויות שהאפליקציה מעניקה</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Section
            icon="sparkles-outline"
            title="הסיפור שלנו"
            description="האפליקציה נולדה מתוך צורך אמיתי לנהל רגעים משמעותיים בחיים האישיים והמשפחתיים. רצינו ליצור מקום אחד שבו כל אירוע מקבל את תשומת הלב הראויה, וכל תיעוד נשמר כדי שתוכלו לחזור ולהיזכר."
            items={[
              'ללוות אתכם מיומיום עמוס אל חוויה מסודרת ומדויקת',
              'להעניק תמונה מלאה של מה חשוב לכם באמת',
              'לאפשר שיתוף וחיבור עמוק יותר בין האנשים סביבכם',
            ]}
          />

          <Section
            icon="compass-outline"
            title="מה המטרה שלנו"
            description="היעד המרכזי הוא לאפשר לכם לעקוב, לתעד ולהעשיר את האירועים בחייכם. בין אם מדובר במשימה קצרה, באירוע משפחתי גדול או בהרגל שרוצים לשמר – הכלים שלפניכם נבנו כדי לפשט ולסדר."
            items={[
              'תכנון מראש של אירועים ויעדים אישיים',
              'שמירת זיכרונות קטנים וגדולים בלחיצת כפתור',
              'הבנת דפוסים והרגלים לאורך זמן כדי לצמוח קדימה',
            ]}
          />

          <Section
            icon="bulb-outline"
            title="איך זה עוזר ביום-יום"
            description="כל אירוע שאתם יוצרים מקבל בית מסודר עם כל הפרטים החשובים: תזכורות, תיעודים, תמונות והערות. כך יודעים תמיד מה נעשה, מה עוד נשאר ולמה כדאי לשים לב בפעם הבאה."
            items={[
              'חיזוק הרגלים טובים ומעקב אחר התקדמות אישית',
              'שיתוף רגעים עם הקרובים אליכם והזמנה להשתתף',
              'שימור זיכרונות שלא תרצו לשכוח',
            ]}
          />

          <View style={styles.divider} />

          <Text style={styles.sectionIntro}>בואו נצא לסיור מעשי קצר ונראה איך מתחילים להשתמש בכלי המרכזיים:</Text>

          <Section
            icon="add-circle-outline"
            title="יצירת אירוע חדש"
            description="פתחו אירוע חדש בלחיצה על הכפתור ״אירוע חדש״ במסך הבית. בחרו שם, צבע, תיאור ותאריך יעד שיתאים לכם. מעכשיו תוכלו לעקוב אחר ההתקדמות שלו בכל רגע."
            items={[
              'שלבו צבע שמייצג את מצב הרוח או סוג האירוע',
              'הגדירו תאריך תפוגה כדי לקבל תזכורות מדויקות',
              'עדכנו את שם האירוע גם לאחר מכן דרך תפריט הפעולות',
            ]}
          />

          <Section
            icon="create-outline"
            title="הוספת תיעוד רגיל"
            description="תיעוד אחד הוא כמו צילום מצב קצר. לחצו על האירוע ואז על ״תיעוד מהיר״ כדי לשמור מחשבה, תחושה או עדכון קצר."
            items={[
              'מומלץ להוסיף לפחות משפט אחד שמדגיש את מה שחשוב לכם כרגע',
              'ההוספה מהירה ומתאימה לרגעים קטנים לאורך היום',
            ]}
          />

          <Section
            icon="document-text-outline"
            title="הוספת תיעוד מפורט"
            description="כשרוצים להעמיק – עברו למסך ״תיעוד מפורט״ והוסיפו כותרת, תיאור, תמונה ותחושה מרכזית. כך נבנית ספרייה מלאה של זיכרונות."
            items={[
              'שלבו תמונות שמעצימות את החוויה',
              'סמנו מה הרגש המרכזי של האירוע או הרגע',
              'הוסיפו טיפים לעצמכם להמשך הדרך',
            ]}
          />

          <Section
            icon="trash-outline"
            title="מחיקת אירוע או תיעוד"
            description="אם אירוע הסתיים או שכבר לא צריך לשמור תיעוד, אפשר למחוק אותו בקלות. בתצוגת האירוע בחרו בתפריט הפעולות ובחרו את הפעולה המתאימה. תמיד תקבלו תזכורת שמוודאת שאתם בטוחים בהחלטה."
            items={[
              'מחיקת אירוע תסיר גם את כל התיעודים שנשמרו תחתיו',
              'אפשר לבחור לארכיון אם רוצים לשמור להמשך בלי לראות במסך הראשי',
              'זכרו שתמיד ניתן ליצור אירוע חדש מאפס',
            ]}
          />

          <View style={styles.tipsCard}>
            <Ionicons name="star-outline" size={26} color="#F7B801" style={styles.tipsIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipsTitle}>טיפ מהיר להצלחה</Text>
              <Text style={styles.tipsText}>
                קבעו הרגל קבוע – לדוגמה, בכל ערב לפני השינה הוסיפו תיעוד קצר מהיום. בתוך שבועות ספורים תראו
                איך הסיפור של האירוע נבנה מול העיניים.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('AddEvent')}
            accessibilityLabel="פתח יצירת אירוע חדש"
          >
            <Ionicons name="rocket-outline" size={22} color="#fff" style={{ marginLeft: 8 }} />
            <Text style={styles.ctaText}>יאללה, בואו ניצור אירוע ראשון</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  backText: {
    marginRight: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  headerTexts: {
    flex: 1,
    marginRight: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'right',
    color: '#1b1b1b',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    textAlign: 'right',
    color: '#4A4A4A',
    lineHeight: 22,
  },
  scrollContent: {
    paddingBottom: 42,
    paddingTop: 10,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(61, 214, 208, 0.15)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(61,214,208,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1b1b1b',
    textAlign: 'right',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#3C3C3C',
    lineHeight: 22,
    textAlign: 'right',
  },
  sectionList: {
    marginTop: 12,
    gap: 6,
  },
  sectionListItem: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
  },
  sectionBullet: {
    marginLeft: 10,
    marginTop: 6,
  },
  sectionListText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 12,
  },
  sectionIntro: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    color: '#212121',
    marginBottom: 18,
  },
  tipsCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff9e6',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fde8b7',
    marginTop: 10,
    marginBottom: 24,
  },
  tipsIcon: {
    marginLeft: 14,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#BD8B13',
    textAlign: 'right',
  },
  tipsText: {
    fontSize: 14,
    color: '#5C4A1F',
    lineHeight: 22,
    textAlign: 'right',
    marginTop: 6,
  },
  ctaButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3DD6D0',
    borderRadius: 999,
    paddingVertical: 14,
    marginBottom: 30,
    shadowColor: '#3DD6D0',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});

export default HelpGuideScreen;
