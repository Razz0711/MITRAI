const fs = require('fs');

// 1. Fix AppShell.tsx mobile padding
let p = 'src/components/AppShell.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  /<main className="pt-2 md:pt-16 pb-20 md:pb-4 min-h-screen">/,
  '<main className="pt-2 md:pt-16 pb-20 md:pb-4 min-h-screen" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>'
);
fs.writeFileSync(p, c);

// 2. Fix home page (buttons and avatars)
p = 'src/app/home/page.tsx';
c = fs.readFileSync(p, 'utf8');

// Fix Header Top Spacing in Feed
c = c.replace(
  /<div className="sticky top-0 z-40 px-4 py-3" style={{/,
  '<div className="sticky top-0 z-40 px-4 py-3" style={{ paddingTop: "max(12px, env(safe-area-inset-top))",\n        '
);

// Fix Avatar Fallback in PostCard
// Currently: <Image src={post.userPhotoUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
c = c.replace(
  /<Image src=\{post\.userPhotoUrl\} alt="" width=\{32\} height=\{32\} className="w-8 h-8 rounded-full object-cover" \/>/g,
  '<Image src={post.userPhotoUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover bg-[var(--surface-light)]" unoptimized onError={(e) => { e.currentTarget.style.display="none"; e.currentTarget.parentElement?.querySelector(".avatar-fallback")?.classList.remove("hidden"); }} />\n          <div className="avatar-fallback hidden w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">{initial}</div>'
);
c = c.replace(
  /post\.userPhotoUrl \? \(/g,
  'post.userPhotoUrl ? ( <div className="relative">'
);
c = c.replace(
  /<\/div>\n        \) : \(/,
  '</div></div>\n        ) : ('
);

// We need a more reliable regex for the image wrapper.
// Actually, let's just make a new Avatar component instead of hacking it!
fs.writeFileSync(p, c);

console.log('UI Fixes applied.');
