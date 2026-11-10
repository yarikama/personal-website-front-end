"""Clips for /learnings/ppo."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words

# The maths font loses \; : a thick space spelled out
GAP = R"\mskip\thickmuskip "
CLIPPED = R"\text{clip}(r,\, 1-\epsilon,\, 1+\epsilon)\, A"


class RatioToClip(Clip):
    """The push for one move in an old batch: the ratio r = pi_theta / pi_old
    times the advantage A. The ratio held inside 1 +- epsilon, and PPO's
    objective, the smaller of the two. Then two moves with their numbers:
    a good one played more often stops; a bad one played more often still
    pulls back."""

    def construct(self):
        title = words("one move from the old batch", font_size=38, color=FADED).to_edge(UP, buff=0.6)
        ratio = formula(
            R"r = \frac{\pi_\theta(a \mid s)}{\pi_{\text{old}}(a \mid s)}",
            font_size=60,
        )
        ratio.next_to(title, DOWN, buff=0.5)
        push = formula(R"r\, A", font_size=64, t2c={"A": SAGE})
        push.next_to(ratio, DOWN, buff=0.55)
        advantage = words("$A$: how much better than usual it went", font_size=34, color=SAGE)
        advantage.next_to(push, DOWN, buff=0.35)
        self.play(FadeIn(title, shift=0.2 * DOWN), Write(ratio), run_time=1.6)
        self.play(FadeIn(push, shift=0.2 * DOWN), FadeIn(advantage), run_time=1.2)
        self.wait(1.2)

        # Hold the ratio inside the band, and take the smaller
        objective, parts = split_formula(
            R"\min\big(", R"r\, A", R",\,", CLIPPED, R"\big)",
            font_size=58,
        )
        parts[3].set_fill(SAGE)
        objective.move_to(push)
        held = words(R"the ratio held between $1-\epsilon$ and $1+\epsilon$", font_size=34, color=SAGE)
        held.next_to(objective, DOWN, buff=0.35)
        self.play(FadeOut(advantage), FadeTransform(push, parts[1]), run_time=0.8)
        self.play(FadeIn(parts[0]), FadeIn(parts[2]), FadeIn(parts[4]), Write(parts[3]), run_time=1.6)
        self.play(FadeIn(held, shift=0.2 * UP))
        self.wait(1.4)

        # Two moves, epsilon = 0.2, both now played 1.3 times as often
        self.play(FadeOut(VGroup(title, ratio, held)), objective.animate.to_edge(UP, buff=0.7), run_time=0.8)
        given = words(R"$\epsilon = 0.2$, the move now played $1.3\times$ as often", font_size=36, color=FADED)
        given.next_to(objective, DOWN, buff=0.55)
        good = formula(
            R"A = +2:" + GAP + R"\min(2.6,\, 2.4) = 2.4",
            font_size=54,
        )
        good_says = words("flat in $r$: it stops pushing", font_size=34, color=SAGE)
        bad = formula(
            R"A = -2:" + GAP + R"\min(-2.6,\, -2.4) = -2.6",
            font_size=54,
        )
        bad_says = words("still moves with $r$: it pulls back", font_size=34, color=FADED)
        rows = VGroup(VGroup(good, good_says).arrange(DOWN, buff=0.2), VGroup(bad, bad_says).arrange(DOWN, buff=0.2))
        rows.arrange(DOWN, buff=0.6).next_to(given, DOWN, buff=0.55)
        self.play(FadeIn(given))
        self.play(Write(good), run_time=1.2)
        self.play(FadeIn(good_says, shift=0.2 * UP))
        self.wait(1.0)
        self.play(Write(bad), run_time=1.2)
        self.play(FadeIn(bad_says, shift=0.2 * UP))
        self.play(VGroup(objective, given, rows).animate.center(), run_time=0.8)
        self.wait(3)
