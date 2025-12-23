'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface InfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfoDialog({ open, onOpenChange }: InfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>About linkd</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div>
            <h3 className="text-lg font-medium mb-3">what's linkd?</h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>linkd streamlines cold outreach by finding the right decision-makers to contact. instead of reaching out to generic emails that get ignored, linkd finds key people like ceos. reaching out to the ppl at the top makes the process much easier, and is much more effective for smaller to mid size companies.</p>
              <p>the vision is to automate your entire workflow. linkd will research companies that match your criteria, find decision-maker emails, write personalized messages, and queue them for approval. the final flow: open the app, review 5 pre-written emails daily to companies we found for you, and send with one click.</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">who is linkd for?</h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>linkd was initially built for job seekers—cold outreach is incredibly effective when looking for opportunities, especially at startups. however, after early testing, i found it also works really well for creators reaching out to brands, particularly smaller ones.</p>
              <p>if you're a student trying to land a job, linkd is ideal for reaching out to startups where direct contact makes a real difference. if you're a content creator looking for brand deals, linkd works exceptionally well for small to mid-size companies where reaching ceos directly significantly increases your chances.</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">who am i?</h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>i'm a fourth-year cs student at carleton university. this past winter, i was struggling to find a job. i would wake up and keep applying, keep applying and get barely any responses. it felt like throwing my applications into a void.</p>
              <p>a friend told me to try emailing companies directly. within a week, i got 7 interviews and even pitched mark cuban my startup. that's when i realized how effective cold emailing is, and that most people didn't know about this. so i built linkd to ease that pain. here's my <a href="https://khizarmalik.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">website</a>. hope this helps.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

