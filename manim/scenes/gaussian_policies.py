"""Clips for /learnings/gaussian-policies."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, words

# The maths font loses \; : a thick space spelled out
GAP = R"\mskip\thickmuskip "
# The Garamond maths has no partial sign: borrow newtx's
PARTIAL = R"\text{\usefont{OML}{ntxmi}{m}{it}\char64}"


class BellToPush(Clip):
    """The bell curve's log, with the spread written as e to the rho, and
    its slope along each of the two numbers: (a - mu) / sigma^2 for the
    centre, (a - mu)^2 / sigma^2 - 1 for the log of the spread. Times how
    much better than usual the try was, they are the two pushes. Then one
    try's numbers."""

    def construct(self):
        title = words("how likely a try $a$ is, under the habit", font_size=36, color=FADED).to_edge(UP, buff=0.5)
        bell = formula(
            R"\pi(a) = \frac{1}{\sigma\sqrt{2\pi}}\, e^{-\frac{(a-\mu)^2}{2\sigma^2}}",
            font_size=64,
        )
        bell.next_to(title, DOWN, buff=0.6)
        self.play(FadeIn(title, shift=0.2 * DOWN), Write(bell), run_time=2)
        self.wait(0.6)

        # Its log, with the spread kept positive as e to the rho
        log = formula(
            R"\log \pi(a) = -\rho - \frac{(a-\mu)^2}{2\sigma^2} + \text{const}",
            font_size=60,
            t2c={R"\rho": SAGE},
        )
        log.move_to(bell)
        note = words(R"with $\sigma = e^{\rho}$: any $\rho$ gives a spread above 0", font_size=36, color=SAGE)
        note.next_to(log, DOWN, buff=0.45)
        self.play(FadeTransform(bell, log), run_time=1.6)
        self.play(FadeIn(note, shift=0.2 * UP))
        self.wait(1.2)

        # Its slope along each number
        self.play(FadeOut(title), VGroup(log, note).animate.to_edge(UP, buff=0.5), run_time=0.8)
        centre = formula(
            Rf"\frac{{{PARTIAL} \log \pi}}{{{PARTIAL} \mu}}" + R" = \frac{a-\mu}{\sigma^2}",
            font_size=56,
        )
        spread = formula(
            Rf"\frac{{{PARTIAL} \log \pi}}{{{PARTIAL} \rho}}" + R" = \frac{(a-\mu)^2}{\sigma^2} - 1",
            font_size=56,
        )
        slopes = VGroup(centre, spread).arrange(DOWN, buff=0.5)
        slopes.next_to(note, DOWN, buff=0.6)
        centre_says = words("toward the try", font_size=34, color=FADED).next_to(centre, RIGHT, buff=0.5)
        spread_says = words("above 0 beyond one spread", font_size=34, color=FADED).next_to(spread, RIGHT, buff=0.5)
        self.play(FadeIn(centre, shift=0.2 * DOWN), run_time=1.2)
        self.play(FadeIn(centre_says))
        self.wait(0.6)
        self.play(FadeIn(spread, shift=0.2 * DOWN), run_time=1.2)
        self.play(FadeIn(spread_says))
        self.wait(1.2)

        # Times how much better than usual: the two pushes
        self.play(FadeOut(VGroup(log, note, centre_says, spread_says)), run_time=0.6)
        mu_push = formula(
            R"\mu" + GAP + R"\leftarrow" + GAP + R"\mu + \alpha\,(r - b)\,\frac{a-\mu}{\sigma^2}",
            font_size=56,
            t2c={"(r - b)": SAGE},
        )
        rho_push = formula(
            R"\rho" + GAP + R"\leftarrow" + GAP + R"\rho + \alpha\,(r - b)\Big(\frac{(a-\mu)^2}{\sigma^2} - 1\Big)",
            font_size=56,
            t2c={"(r - b)": SAGE},
        )
        pushes = VGroup(mu_push, rho_push).arrange(DOWN, buff=0.5).to_edge(UP, buff=0.8)
        self.play(FadeTransform(centre, mu_push), FadeTransform(spread, rho_push), run_time=1.8)
        better = words("$r - b$: how much better than usual", font_size=36, color=SAGE)
        better.next_to(pushes, DOWN, buff=0.5)
        self.play(FadeIn(better, shift=0.2 * UP))
        self.wait(1.0)

        # One try: centre 4, spread 1, usual 6, two pinches out, rated 8
        given = words(R"$\mu = 4$, $\sigma = 1$, $b = 6$; a try at $a = 6$ rates $r = 8$", font_size=36, color=FADED)
        given.next_to(better, DOWN, buff=0.6)
        nums = VGroup(
            formula(R"\text{centre:}" + GAP + R"(8-6) \times \frac{6-4}{1} = +4", font_size=52),
            formula(R"\text{spread:}" + GAP + R"(8-6) \times (2^2 - 1) = +6", font_size=52, color=SAGE),
        ).arrange(DOWN, buff=0.35, aligned_edge=LEFT)
        nums.next_to(given, DOWN, buff=0.45)
        self.play(FadeIn(given))
        self.play(Write(nums[0]), run_time=1.2)
        self.play(Write(nums[1]), run_time=1.2)
        self.play(VGroup(pushes, better, given, nums).animate.center(), run_time=0.8)
        self.wait(3)
