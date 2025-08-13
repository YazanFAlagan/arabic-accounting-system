/**
 * تنسيق العملة المصرية بدون أصفار زائدة
 * @param amount المبلغ
 * @returns المبلغ منسق بالعملة المصرية
 */
export function formatCurrency(amount: number): string {
  // تحويل الرقم إلى رقم عشري مع رقمين فقط بعد الفاصلة
  const formattedAmount = Number(amount).toFixed(2);
  
  // إزالة الأصفار الزائدة في النهاية
  const cleanAmount = formattedAmount.replace(/\.?0+$/, '');
  
  // إضافة العملة المصرية
  return `${cleanAmount} ج.م.`;
}

/**
 * تنسيق العملة مع إزالة الأصفار الزائدة
 * @param amount المبلغ
 * @returns المبلغ منسق بدون أصفار زائدة
 */
export function formatCleanCurrency(amount: number): string {
  // إذا كان الرقم صحيح (بدون كسور)
  if (Number.isInteger(amount)) {
    return `${amount} ج.م.`;
  }
  
  // إذا كان الرقم عشري، نعرض رقمين فقط بعد الفاصلة
  const formattedAmount = Number(amount).toFixed(2);
  
  // إزالة الأصفار الزائدة في النهاية
  const cleanAmount = formattedAmount.replace(/\.?0+$/, '');
  
  return `${cleanAmount} ج.م.`;
}

/**
 * تنسيق الأرقام الكبيرة مع فواصل
 * @param amount المبلغ
 * @returns المبلغ منسق مع فواصل
 */
export function formatNumberWithCommas(amount: number): string {
  return amount.toLocaleString('ar-EG');
}

/**
 * تنسيق العملة مع فواصل للأرقام الكبيرة
 * @param amount المبلغ
 * @returns المبلغ منسق بالعملة مع فواصل
 */
export function formatCurrencyWithCommas(amount: number): string {
  const formattedNumber = formatNumberWithCommas(amount);
  const cleanAmount = Number(amount).toFixed(2).replace(/\.?0+$/, '');
  
  return `${cleanAmount} ج.م.`;
}
