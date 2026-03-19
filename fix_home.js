const fs = require('fs');

let home = fs.readFileSync('src/app/home/page.tsx', 'utf8');

// 1. Imports
if (!home.includes("import Avatar")) {
  home = home.replace(
    "import { useAuth } from '@/lib/auth';",
    "import { useAuth } from '@/lib/auth';\nimport Avatar from '@/components/Avatar';\nimport PostCard from '@/components/PostCard';"
  );
}

// 2. Padding
home = home.replace(
  /<div className="sticky top-0 z-40 px-4 py-3" style={{/,
  '<div className="sticky top-0 z-40 px-4 py-3" style={{ paddingTop: "calc(max(12px, env(safe-area-inset-top)) + 0.75rem)",\n        '
);

// 3. Avatar in Header
const headerRegex = /<Link href="\/me" className="shrink-0">\s*\{studentPhoto \? \([\s\S]*?\) : \([\s\S]*?\}\s*<\/Link>/;
home = home.replace(headerRegex, `<Link href="/me" className="shrink-0">\n            <Avatar src={studentPhoto} name={studentName || "?"} size={36} className="border-2 border-[var(--primary)]/30" />\n          </Link>`);

// 4. Remove inline PostCard definition AND update <PostCard calls to pass categories array
// Find the start of function PostCard({
const pcStart = home.indexOf('/* ═══ Post Card Component ═══ */');
if (pcStart !== -1) {
  home = home.substring(0, pcStart);
}

// Pass categories prop to all <PostCard> calls
home = home.replace(/<PostCard key=\{post.id\} post=\{post\}/g, `<PostCard key={post.id} post={post} categories={CATEGORIES}`);

fs.writeFileSync('src/app/home/page.tsx', home);
console.log('Home fixed');
