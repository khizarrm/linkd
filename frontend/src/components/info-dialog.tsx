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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-8">
        <DialogHeader className="pb-4">
          <DialogTitle>About Linkd</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-medium mb-4">What's Linkd?</h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
              <p>Linkd streamlines cold outreach by finding the right decision-makers to contact. Instead of reaching out to generic emails that get ignored, Linkd finds key people like CEOs. Reaching out to the people at the top makes the process much easier, and is much more effective for smaller to mid-size companies.</p>
              <p>The vision is to automate your entire workflow. Linkd will research companies that match your criteria, find decision-maker emails, write personalized messages, and queue them for approval. The final flow: open the app, review 5 pre-written emails daily to companies we found for you, and send with one click.</p>
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Who Is Linkd For?</h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
              <p>Linkd was initially built for job seekers—cold outreach is incredibly effective when looking for opportunities, especially at startups. However, after early testing, I found it also works really well for creators reaching out to brands, particularly smaller ones.</p>
              <p>If you're a student trying to land a job, Linkd is ideal for reaching out to startups where direct contact makes a real difference. If you're a content creator looking for brand deals, Linkd works exceptionally well for small to mid-size companies where reaching CEOs directly significantly increases your chances.</p>
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Who Am I?</h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
              <p>I'm a fourth-year CS student at Carleton University. This past winter, I was struggling to find a job. I would wake up and keep applying, keep applying and get barely any responses. It felt like throwing my applications into a void.</p>
              <p>A friend told me to try emailing companies directly. Within a week, I got 7 interviews and even pitched Mark Cuban my startup. That's when I realized how effective cold emailing is, and that most people didn't know about this. So I built Linkd to ease that pain. Here's my <a href="https://khizarmalik.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">website</a>. Hope this helps.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

