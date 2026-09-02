from pathlib import Path

p = Path('src/components/CharacterProfileModal.tsx')
s = p.read_text()

old_sig = '''function HeroBanner({
  fullName,
  person,
  healthState,
  guildTheme,
}: {
  fullName: string;
  person: any;
  healthState: { label: string; pillClass: string };
  guildTheme: GuildTheme;
}) {'''
new_sig = '''function HeroBanner({
  fullName,
  person,
  healthState,
  guildTheme,
  setExpandedHeroUrl,
}: {
  fullName: string;
  person: any;
  healthState: { label: string; pillClass: string };
  guildTheme: GuildTheme;
  setExpandedHeroUrl: (url: string | null) => void;
}) {'''
if old_sig not in s:
    raise SystemExit('HeroBanner signature not found')
s = s.replace(old_sig, new_sig, 1)

old_avatar = '''            <div className="relative flex h-full w-full items-center justify-center">
              <Avatar
                name={fullName}
                src={person.portraitUrl}
                size={176}
                className="h-full w-full"
              />
            </div>'''
new_avatar = '''            <div className="relative flex h-full w-full items-center justify-center">
              {person.portraitUrl ? (
                <button
                  type="button"
                  onClick={() => setExpandedHeroUrl(person.portraitUrl || null)}
                  className="h-full w-full cursor-zoom-in transition-transform duration-300 hover:scale-[1.025]"
                  aria-label={`View ${fullName} hero image`}
                  title="Click to view full hero image"
                >
                  <Avatar
                    name={fullName}
                    src={person.portraitUrl}
                    size={176}
                    className="h-full w-full"
                  />
                </button>
              ) : (
                <Avatar
                  name={fullName}
                  src={person.portraitUrl}
                  size={176}
                  className="h-full w-full"
                />
              )}
            </div>'''
if old_avatar not in s:
    raise SystemExit('Hero portrait block not found')
s = s.replace(old_avatar, new_avatar, 1)

old_state = '''  const [expandedCompanionUrl, setExpandedCompanionUrl] = useState<string | null>(
    null
  );'''
new_state = '''  const [expandedCompanionUrl, setExpandedCompanionUrl] = useState<string | null>(
    null
  );
  const [expandedHeroUrl, setExpandedHeroUrl] = useState<string | null>(null);'''
if old_state not in s:
    raise SystemExit('expanded companion state not found')
s = s.replace(old_state, new_state, 1)

old_usage = '''                      <HeroBanner
                        fullName={fullName}
                        person={person}
                        healthState={healthState}
                        guildTheme={guildTheme}
                      />'''
new_usage = '''                      <HeroBanner
                        fullName={fullName}
                        person={person}
                        healthState={healthState}
                        guildTheme={guildTheme}
                        setExpandedHeroUrl={setExpandedHeroUrl}
                      />'''
if old_usage not in s:
    raise SystemExit('HeroBanner usage not found')
s = s.replace(old_usage, new_usage, 1)

anchor = '''      {expandedCompanionUrl && (
        <button
          type="button"
          onClick={() => setExpandedCompanionUrl(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/88 backdrop-blur-sm"
        >
          <div className="relative max-h-[90vh] max-w-[90vw] p-4">
            <img
              src={expandedCompanionUrl}
              alt="Expanded companion"
              className="max-h-[85vh] max-w-[85vw] object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.7)]"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />

            <div className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-zinc-300">
              Click anywhere to close
            </div>
          </div>
        </button>
      )}'''
if anchor not in s:
    raise SystemExit('companion lightbox anchor not found')
hero_overlay = anchor + '''

      {expandedHeroUrl && (
        <button
          type="button"
          onClick={() => setExpandedHeroUrl(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/88 backdrop-blur-sm"
          aria-label="Close expanded hero image"
        >
          <div className="relative max-h-[90vh] max-w-[90vw] p-4">
            <img
              src={expandedHeroUrl}
              alt={`Expanded hero portrait of ${fullName}`}
              className="max-h-[85vh] max-w-[85vw] object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.7)]"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />

            <div className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-zinc-300">
              Click anywhere to close
            </div>
          </div>
        </button>
      )}'''
s = s.replace(anchor, hero_overlay, 1)

p.write_text(s)
print('Added hero portrait lightbox')
