import type { Locale } from './i18n';
import en from './dictionaries/en.json';
import ru from './dictionaries/ru.json';
import uz from './dictionaries/uz.json';

export type Dictionary = typeof uz;

const dictionaries: Record<Locale, Dictionary> = { uz, ru, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.uz;
}
