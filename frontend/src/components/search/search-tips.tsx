'use client';

export function SearchTips() {
  const tips = [
    'Keep subject and emails as brief as possible',
    'Include profile information in the footer',
  ];

  return (
    <div className="mt-6 sm:mt-8 md:mt-10 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <div className="max-w-5xl mx-auto px-4">
        <ul className="space-y-3 sm:space-y-4">
          {tips.map((tip, index) => (
            <li
              key={index}
              className="text-xs sm:text-sm md:text-base font-sans font-light tracking-tight text-[#6a6a6a]"
            >
              • {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

