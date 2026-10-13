import { Metadata } from "next"
import Link from "next/link"
import { Bell, MessageSquare, Reply, ThumbsUp } from "lucide-react"

import { siteConfig } from "@/config/site"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExampleDiscussion } from "@/components/example-discussion"

import { GetStarted } from "./get-started"

const description =
  "Like, comment on and discuss Microsoft 365 Message Center and Roadmap posts with other admins: what it is, why it is here, and how to take part."

export const metadata: Metadata = {
  title: "Discuss Message Center posts",
  description,
  alternates: { canonical: "/discuss" },
  openGraph: {
    title: `Discuss Message Center posts | ${siteConfig.name}`,
    description,
    url: "/discuss",
    images: ["/og-default.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `Discuss Message Center posts | ${siteConfig.name}`,
    description,
    images: ["/og-default.png"],
  },
}

const CAN_DO = [
  {
    icon: ThumbsUp,
    title: "Like or dislike a post",
    text: "One press tells Microsoft and other admins how a change is landing. The counts show on the post and in the list.",
  },
  {
    icon: MessageSquare,
    title: "Comment",
    text: "Say what happened when it reached your tenant, ask what a line in the post means, or share the setting that fixed it.",
  },
  {
    icon: Reply,
    title: "Reply and like comments",
    text: "Answer someone's question directly, and like the comments that helped so the next reader finds them first.",
  },
  {
    icon: Bell,
    title: "Hear back",
    text: "The bell in the header tells you when someone replies to you or mentions you.",
  },
]

export default function DiscussPage() {
  const zap = siteConfig.zap.url
  return (
    <section className="page-shell">
      <div className="page-intro">
        <h1 className="page-title">Have questions or thoughts?</h1>
        <p className="page-description">
          You can now like, comment on and discuss every Message Center,
          Roadmap and Azure Updates post, right here on its page. Tell other admins what happened
          in your tenant, and find out what happened in theirs.
        </p>
        <GetStarted />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Why this is here</CardTitle>
            </CardHeader>
            <CardContent className="readable-card-content">
              <p>
                A Message Center post tells you what is changing. It cannot tell
                you how it went for the tenant that got it a week before you
                did.
              </p>
              <p>
                Admins already swap that in private chats and scattered threads:
                &quot;it reached us on Monday&quot;, &quot;this is what
                broke&quot;, &quot;this setting turns it off&quot;. Now it sits
                next to the post it is about, where the next person will look.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What you can do</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-4">
                {CAN_DO.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                      <item.icon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold leading-6">{item.title}</p>
                      <p className="text-[15px] leading-6 text-foreground/80">
                        {item.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <ExampleDiscussion />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Who you are talking to</CardTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <p>
              Discussions are hosted on{" "}
              <a className="readable-link" href={zap}>
                zap.ms
              </a>
              , a community site I&apos;m building for people in the Microsoft
              community, focused on tech and getting work done. You sign in
              once and stay on this site.
            </p>
            <ul>
              <li>
                We recommend signing in with LinkedIn, so people go by their
                real name. Microsoft, Google, GitHub and an emailed code work
                too.
              </li>
              <li>
                An <strong>MVP</strong> or <strong>Microsoft</strong> badge next
                to a name is verified, not self-declared.
              </li>
              <li>
                We only ask for your name, email and profile photo, and never
                post anything on your behalf.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How you can help</CardTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <ul>
              <li>
                <strong>Share what you saw.</strong> When a change reaches your
                tenant, say when, what it did and what you changed. That is the
                comment everyone is looking for.
              </li>
              <li>
                <strong>Answer a question</strong> if you know, and like the
                answers that helped you.
              </li>
              <li>
                <strong>Send a post to a colleague.</strong> Every post has its
                own address, and its discussion comes with it.
              </li>
              <li>
                <strong>Add your tenant to the archive.</strong> Posts differ by
                tenant;{" "}
                <Link className="readable-link" href="/contribute">
                  contributing yours
                </Link>{" "}
                fills in the ones others never receive.
              </li>
              <li>
                <strong>Keep it friendly.</strong> Assume the other person means
                well; the{" "}
                <a className="readable-link" href={`${zap}/guidelines`}>
                  community guidelines
                </a>{" "}
                are short.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ready?</CardTitle>
        </CardHeader>
        <CardContent className="readable-card-content">
          <p>
            Open any post and scroll to Discussion, or start with the ones
            people are talking about on the home page.
          </p>
          <GetStarted />
        </CardContent>
      </Card>
    </section>
  )
}
