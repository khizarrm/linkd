'use client';

import { useRouter } from 'next/navigation';

export default function GuidePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black" style={{ fontFamily: 'var(--font-fira-mono)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/login')}
            className="text-2xl font-bold text-white hover:text-white/80 transition-colors"
          >
            linkd
          </button>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 border border-white text-white hover:bg-white/10 transition-all duration-200 lowercase rounded"
          >
            sign in
          </button>
        </div>
      </header>

      {/* Main Content */}
      <article className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
          how to write a good cold email
        </h1>
        <p className="text-white/50 mb-12 text-sm">
          by khizar malik · a guide to effective outreach
        </p>

        <div className="space-y-8 text-white/80 leading-relaxed">
          <p className="text-sm md:text-base">
            cold emailing is simple if you do it right. here's what works.
          </p>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              lead with value
            </h3>
            <p className="text-sm md:text-base">
              open with what you can do for them. something like "this is who i am, this is what i can do, this is what i want to do." get straight to the point—what value are you bringing? that's what they care about.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              keep it short
            </h3>
            <p className="text-sm md:text-base">
              you're reaching out to busy people. respect their time from the start. the shorter your email, the more likely they'll actually read it. say what you need to say and get out.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              be casual
            </h3>
            <p className="text-sm md:text-base">
              talk to them like a normal person. don't grovel or act like they're above you. when you do that, it comes off as desperate, and you're not desperate. if you provide genuine value, there's nothing to be desperate about.
            </p>
            <p className="text-sm md:text-base mt-2">
              don't ask for too much. keep it light.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              skip the resume
            </h3>
            <p className="text-sm md:text-base">
              you don't need to attach your resume. just say what you need to say. your website should function as your resume anyway—if they're interested, they'll click through and look themselves. don't force it on them.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              always end with an ask
            </h3>
            <p className="text-sm md:text-base">
              don't just say "let me know what you think" or "hope to hear from you." be specific. "would you be open to a quick chat?" or "could i send you my portfolio?" makes it easy for them to say yes. one clear ask, not five options.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              footer matters
            </h3>
            <p className="text-sm md:text-base">
              always include your info in the footer. have your website, linkedin, and one other link. for tech, i find website, linkedin, and twitter works well. if you're a creator, your portfolio site is usually the move.
            </p>
            <p className="text-sm md:text-base mt-2">
              this gives them easy access to learn more about you without cluttering the email itself.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              the point
            </h3>
            <p className="text-sm md:text-base">
              save them as much time as possible. you're often reaching out to ceos and busy people, especially through linkedin. make it easy for them to say yes by making it easy for them to read.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-sm md:text-base italic text-white/70">
              templates below got me two internships. use them and good luck.
            </p>
          </div>

          <div className="pt-6 space-y-8">
            <h3 className="text-lg md:text-xl font-medium text-white">
              templates
            </h3>

            <div className="space-y-6">
              <div className="bg-white/5 p-6 rounded border border-white/10">
                <p className="text-xs text-white/60 mb-2">fullscript (interning there this fall!)</p>
                <p className="text-sm font-medium text-white mb-3">subject: i'll be brief- 4th year student</p>
                <div className="text-sm text-white/80 space-y-2 whitespace-pre-line">
                  <p>Hey Kyle,</p>
                  <p>I'm Khizar, CS @ Carleton in the Co-op programme. Been making AI applications for 2+ years, quite good with building end to end products.</p>
                  <p>I really admire what you're building at Fullscript. Making healthcare more accessible is pretty cool, your mission is inspiring. I'm reaching out because I'd love the opportunity to contribute to your team.</p>
                  <p>Some of my past projects include:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>thirdspace, a social networking app to share experiences (1,000+ users, ranked top 70 in the App Store)</li>
                    <li>passr, a resume optimization platform where users can directly prompt their resumes (40+ active users)</li>
                    <li>A chrome extension which uses a custom ML model to determine if a website is considered 'productive' or 'unproductive' (launching this week)</li>
                  </ul>
                  <p>I'm free this fall. If you're open to it, I'd be happy to chat further.</p>
                  <p>Best,</p>
                  <p>Khizar Malik</p>
                  <p className="text-xs">website | linkedin</p>
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded border border-white/10">
                <p className="text-xs text-white/60 mb-2">pally ai (yc):</p>
                <p className="text-sm font-medium text-white mb-3">subject: motivated student, will hustle @ pally ai</p>
                <div className="text-sm text-white/80 space-y-2 whitespace-pre-line">
                  <p>Hey Wyatt,</p>
                  <p>I remember using Pally AI for relationship management a while back, love the UI and UX. Can't wait to see what other things you guys have in store.</p>
                  <p>I've been building for fun for ~2 years (thirdspace 1.3k + users, passr 40+), quite good with building end to end products.</p>
                  <p>If you're open, I'd love a quick chat about potential internship opportunities for Winter.</p>
                  <p>Best,</p>
                  <p>Khizar Malik</p>
                  <p className="text-xs">website | linkedin</p>
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded border border-white/10">
                <p className="text-xs text-white/60 mb-2">pitched mark cuban our startup</p>
                <p className="text-sm font-medium text-white mb-3">subject: Solving the loneliness epidemic—1,000+ student users in 4 wks</p>
                <div className="text-sm text-white/80 space-y-2 whitespace-pre-line">
                  <p>Hey Mark,</p>
                  <p>I'm Khizar (CS @ Carleton) building thirdspace, a live "meet-up right now" app. Students type "study in library" and nearby classmates get an instant ping; one tap and they're meeting IRL.</p>
                  <p>The U.S. Surgeon General calls loneliness an "epidemic" hitting Gen Z hardest. We're fixing that.</p>
                  <p className="font-medium">Early proof</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>One-campus launch: 1,000+ active students → #70 in Canada's App Store</li>
                    <li>First paid pilot: Ottawa nightclub logged 200+ live walk-ins (over capacity) in one night</li>
                    <li>Model: venues pay us to fill seats; current run-rate $4.3 k MRR / 1 k actives</li>
                    <li>Closed $50 k; raising $500 k pre-seed to reach five campuses by September</li>
                  </ul>
                  <p>Could I send you our two-page deck?</p>
                  <p>Best,</p>
                  <p>Khizar Malik</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-sm md:text-base text-white/80">
                these all got me insane opportunities. there's doors around you waiting to be opened, all you need to do is knock. you got this!
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* Footer CTA */}
      <div className="border-t border-white/10 bg-black">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            ready to start reaching out?
          </h2>
          <p className="text-white/60 mb-8 text-sm md:text-base">
            linkd finds decision-maker emails so you can focus on writing great messages
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-3 bg-white text-black hover:bg-white/90 transition-all duration-200 lowercase rounded font-medium"
          >
            try linkd for free
          </button>
        </div>
      </div>
    </div>
  );
}

