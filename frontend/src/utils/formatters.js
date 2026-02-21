import i18n from '../i18n';

/**
 * Technical Currency Formatter
 * Automatically switches between ISK format and International format
 */
export const formatCurrency = (value) => {
    const locale = i18n.language === 'is' ? 'is-IS' : 'en-US';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'ISK',
        maximumFractionDigits: 0
    }).format(value);
};

/**
 * Standard Date Formatter
 */
export const formatDate = (dateString) => {
    const locale = i18n.language === 'is' ? 'is-IS' : 'en-GB';
    return new Date(dateString).toLocaleDateString(locale);
};