import { Fugaz_One, Work_Sans } from 'next/font/google';

const fugaz = Fugaz_One({ weight: '400', subsets: ['latin'], variable: '--font-fugaz', display: 'swap' });
const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans', display: 'swap' });

/** Classes that define --font-fugaz and --font-work-sans. Shared by the root layout and global-error, which renders its own <html>. */
export const fontVariables = `${fugaz.variable} ${workSans.variable}`;
