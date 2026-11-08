import i18n from "./i18n";

export function getDogAgeMonths(dog, today = new Date()) {
  if (!dog) return null;

  if (dog.birthDate) {
    let birthDate;
    if (typeof dog.birthDate.toDate === "function") {
      birthDate = dog.birthDate.toDate();
    } else if (dog.birthDate instanceof Date) {
      birthDate = dog.birthDate;
    } else if (Number.isFinite(dog.birthDate.seconds)) {
      birthDate = new Date(dog.birthDate.seconds * 1000);
    } else {
      birthDate = new Date(dog.birthDate);
    }

    if (Number.isNaN(birthDate.getTime())) return null;

    let months = (today.getFullYear() - birthDate.getFullYear()) * 12 +
      today.getMonth() - birthDate.getMonth();
    if (today.getDate() < birthDate.getDate()) months -= 1;
    return Math.max(0, months);
  }

  const legacyAge = Number(dog.age);
  if (!Number.isFinite(legacyAge) || legacyAge < 0) return null;
  return Math.floor(legacyAge * 12);
}

function getPluralForm(value, locale) {
  const language = locale.split("-")[0];
  if (language === "ru") {
    if (value % 10 === 1 && value % 100 !== 11) return "one";
    if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 12 || value % 100 > 14)) {
      return "few";
    }
    return "other";
  }
  return value === 1 ? "one" : "other";
}

export function formatDogAgeYears(years, locale = i18n.locale) {
  const form = getPluralForm(years, locale);
  return `${years} ${i18n.t(`dog_age_year_${form}`)}`;
}

export function formatDogAge(dog, locale = i18n.locale) {
  const totalMonths = getDogAgeMonths(dog);
  if (totalMonths === null) return dog?.age ? String(dog.age) : "";

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [];

  if (years > 0) {
    parts.push(formatDogAgeYears(years, locale));
  }
  if (months > 0 || years === 0) {
    const form = getPluralForm(months, locale);
    parts.push(`${months} ${i18n.t(`dog_age_month_${form}`)}`);
  }

  return parts.join(" ");
}