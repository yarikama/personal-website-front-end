"""Clips for /learnings/reinforce."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, words

GRAD = R"\nabla "
# The maths font loses \; : a thick space spelled out
GAP = R"\mskip\thickmuskip "


class TheoremToSamples(Clip):
    """The policy gradient theorem turned, a step at a time, into something
    one episode can estimate: the sum over states becomes an average, the
    sum over actions becomes an average by dividing by pi, grad pi over pi
    is grad log pi, the return stands in for q, and the step is REINFORCE."""

    def construct(self):
        caption = words("the slope of the lunch you can expect", font_size=36, color=FADED).to_edge(UP, buff=0.5)
        theorem = formula(
            GRAD + R"J" + GAP + R"\propto" + GAP + R"\sum_s \Pr(s) \sum_a q(s,a)\, " + GRAD + R"\pi(a|s)",
            font_size=64,
            t2c={R"\Pr(s)": SAGE},
        )
        theorem.next_to(caption, DOWN, buff=0.6)
        self.play(FadeIn(caption, shift=0.2 * DOWN), Write(theorem), run_time=2.2)
        self.wait(0.6)

        # Read its three parts
        notes = VGroup(
            words(R"$\Pr(s)$: how often you reach fork $s$", font_size=36, color=FADED),
            words(R"$q(s,a)$: how good turn $a$ is there", font_size=36, color=FADED),
            words(R"$\nabla\pi(a|s)$: how a nudge moves its chance", font_size=36, color=FADED),
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        notes.next_to(theorem, DOWN, buff=0.6)
        self.play(LaggedStart(*(FadeIn(n, shift=0.15 * UP) for n in notes), lag_ratio=0.5), run_time=2)
        no_slope = words(R"no slope of $\Pr(s)$ needed, though the habits change it", font_size=36, color=SAGE)
        no_slope.next_to(notes, DOWN, buff=0.5)
        self.play(FadeIn(no_slope))
        self.wait(1.4)
        self.play(FadeOut(VGroup(notes, no_slope)), FadeOut(caption))
        self.play(theorem.animate.to_edge(UP, buff=0.5))

        # Each line is the one before, rewritten
        lines = [
            (
                R"{} = \mathrm{E}\big[ \sum_a q(S,a)\, " + GRAD + R"\pi(a|S) \big]",
                "an average over the states you visit",
            ),
            (
                R"{} = \mathrm{E}\big[ \sum_a \pi(a|S)\, q(S,a)\, \frac{" + GRAD + R"\pi(a|S)}{\pi(a|S)} \big]",
                R"times $\pi$, divided by $\pi$",
            ),
            (
                R"{} = \mathrm{E}\big[\, q(S,A)\, " + GRAD + R"\log \pi(A|S) \,\big]",
                "an average over the action you take",
            ),
            (
                R"{} = \mathrm{E}\big[\, G\, " + GRAD + R"\log \pi(A|S) \,\big]",
                "the return that followed stands in for $q$",
            ),
        ]
        current = None
        current_note = None
        for tex, text in lines:
            line = formula(tex, font_size=60, t2c={"G": SAGE} if R"G\," in tex else {})
            line.next_to(theorem, DOWN, buff=0.7)
            note = words(text, font_size=34, color=FADED).next_to(line, DOWN, buff=0.35)
            if current is None:
                self.play(FadeIn(line, shift=0.2 * DOWN), FadeIn(note), run_time=1.4)
            else:
                self.play(FadeTransform(current, line), FadeTransform(current_note, note), run_time=1.6)
            current, current_note = line, note
            self.wait(1.5)

        # One sample of that average per step: REINFORCE
        step = formula(
            R"\theta" + GAP + R"\leftarrow" + GAP + R"\theta + \alpha\, (G - b)\, " + GRAD + R"\log \pi(A|S)",
            font_size=60,
            t2c={"(G - b)": SAGE},
        )
        step.next_to(current_note, DOWN, buff=0.7)
        box = SurroundingRectangle(step, buff=0.2, stroke_color=SAGE, stroke_width=2.5)
        name = words("REINFORCE: one walk, one sample; a baseline $b$ cuts the noise", font_size=34, color=SAGE)
        name.next_to(box, DOWN, buff=0.3)
        self.play(Write(step), run_time=2)
        self.play(ShowCreation(box), FadeIn(name, shift=0.2 * UP))
        self.play(VGroup(theorem, current, current_note, step, box, name).animate.center(), run_time=1)
        self.wait(3)
