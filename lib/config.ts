type CompanyContacts = Record<'phone' | 'whatsapp' | 'email' | 'address' | 'instagram' | 'facebook' | 'linkedin', string>;
const contacts: CompanyContacts = {
  phone: '+351 912 180 368',
  whatsapp: '+351 912 180 368',
  email: 'geral@alicercereferencial.pt',
  address: '',
  instagram: '',
  facebook: '',
  linkedin: '',
};

export const company = {
  name: 'Alicerce Referencial Construções',
  shortName: 'Alicerce Referencial',
  description: 'Soluções de construção, remodelação e renovação, com acompanhamento desde os trabalhos estruturais até aos acabamentos. Atenção aos detalhes e compromisso com cada projeto.',
  quoteReferencePrefix: 'AR',
  consentVersion: '2026-09-16',
  country: 'Portugal', currency: 'EUR',
  locale: 'pt-PT', timezone: 'Europe/Lisbon',
  budgetBands: ['Até 10 000 €', '10 000–25 000 €', '25 000–50 000 €', '50 000–100 000 €', 'Mais de 100 000 €', 'Por definir'],
  // Preencher apenas com contactos confirmados da empresa.
  contacts,
} as const;

export function companyWhatsappUrl(): string | undefined {
  const number = company.contacts.whatsapp.replace(/\D/g, '');
  return number ? 'https://wa.me/' + number + '?text=' + encodeURIComponent('Olá, gostaria de falar sobre um projeto com a ' + company.shortName + '.') : undefined;
}

// Fonte única da paleta, aplicada como variáveis CSS pelo layout raiz.
export const brandColors = {
  navy: '#03152F',
  navySecondary: '#061B36',
  gold: '#D8AA4A',
  goldSecondary: '#C89532',
  white: '#FFFFFF',
  offWhite: '#F7F7F5',
  darkGray: '#20242A',
} as const;
export function formatMoney(cents: number) {
  return new Intl.NumberFormat(company.locale, { style: 'currency', currency: company.currency }).format(cents / 100);
}
export function formatDate(date: string, timezone: string = company.timezone) {
  return new Intl.DateTimeFormat(company.locale, { timeZone: timezone }).format(new Date(date));
}
