"""Clips for /learnings/optimistic-initial-values."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class OptimismDrains(Clip):
    """How a hopeful start drains away with a fixed step: the update, the
    same update as a gap that shrinks by (1 - alpha) each time, then the
    gap after k rewards, and the numbers 5, 4.6, 4.24, 3.92."""

    def construct(self):
        title = words(R"each reward moves the estimate a share $\alpha$ of the way", font_size=36, color=FADED)
        title.to_edge(UP, buff=0.6)
        rule, rp = split_formula(
            "Q_{k+1}", "=", "Q_k", "+", R"\alpha", "(", "R", "-", "Q_k", ")",
            font_size=60,
            t2c={R"\alpha": FADED},
        )
        rule.next_to(title, DOWN, buff=0.6)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        self.play(Write(rule), run_time=2)
        self.wait(0.8)

        # Take R from both sides and gather what's left: a gap times (1 - alpha)
        hint = words(R"take $R$ from both sides", font_size=34, color=FADED)
        hint.next_to(rule, DOWN, buff=0.5)
        gap, gp = split_formula(
            "Q_{k+1}", "-", "R", "=", R"(1-\alpha)", "(", "Q_k", "-", "R", ")",
            font_size=60,
            t2c={R"(1-\alpha)": FADED},
        )
        gap.next_to(hint, DOWN, buff=0.5)
        self.play(FadeIn(hint))
        self.play(
            TransformFromCopy(rp[0], gp[0]),
            TransformFromCopy(rp[1], gp[3]),
            TransformFromCopy(rp[4], gp[4]),
            # The bracket's R and Q_k trade places
            *(TransformFromCopy(rp[i], gp[j]) for i, j in [(5, 5), (6, 8), (7, 7), (8, 6), (9, 9)]),
            FadeIn(gp[1:3]),
            run_time=2,
        )
        self.play(gp[0:3].animate.set_fill(SAGE), gp[5:].animate.set_fill(SAGE))
        now = Brace(gp[0:3], DOWN, buff=0.15).set_fill(SAGE)
        before = Brace(gp[5:], DOWN, buff=0.15).set_fill(SAGE)
        now_said = words("the gap now", font_size=34, color=SAGE).next_to(now, DOWN, buff=0.15)
        before_said = words("the gap before", font_size=34, color=SAGE).next_to(before, DOWN, buff=0.15)
        self.play(GrowFromCenter(now), FadeIn(now_said), GrowFromCenter(before), FadeIn(before_said))
        self.wait(1.5)

        # Every reward does the same, so after k of them
        after, ap = split_formula(
            R"\text{gap after } k \text{ rewards}", "=", R"(1-\alpha)^k", R"\times", R"\text{starting gap}",
            font_size=56,
            t2c={R"(1-\alpha)^k": INK},
        )
        after.to_edge(UP, buff=0.9)
        ap[0].set_fill(SAGE)
        ap[4].set_fill(SAGE)
        self.play(
            FadeOut(title, shift=0.5 * UP),
            FadeOut(rule, shift=0.5 * UP),
            FadeOut(hint, shift=0.5 * UP),
            FadeOut(VGroup(now, before, now_said, before_said)),
            FadeTransform(gap, after),
            run_time=1.5,
        )
        self.play(FlashAround(ap[2], color=SAGE, stroke_width=3))
        self.wait(0.6)

        # With numbers: start at 5, alpha = 0.1, every reward 1
        given = words(R"start at $5$, $\alpha = 0.1$, rewards of $1$", font_size=36, color=FADED)
        given.next_to(after, DOWN, buff=0.9)
        values = ["5", "4.6", "4.24", "3.92"]
        gaps = ["4", "3.6", "3.24", "2.92"]
        estimates = VGroup(*(formula(v, font_size=60) for v in values))
        estimates.arrange(RIGHT, buff=1.3).next_to(given, DOWN, buff=0.7)
        arrows = VGroup(
            *(
                Arrow(estimates[i].get_right(), estimates[i + 1].get_left(), buff=0.25, stroke_color=FADED, stroke_width=3)
                for i in range(len(values) - 1)
            )
        )
        gap_labels = VGroup(
            *(
                formula(g, font_size=38, color=SAGE).next_to(estimates[i], DOWN, buff=0.35)
                for i, g in enumerate(gaps)
            )
        )
        # What the row under the estimates is: how far each is above the reward
        gap_word = words("gap", font_size=36, color=SAGE).next_to(gap_labels[0], LEFT, buff=0.45)
        gap_word.align_to(gap_labels[0], DOWN)
        times = VGroup(
            *(formula(R"\times 0.9", font_size=34, color=FADED).next_to(arrows[i], UP, buff=0.1) for i in range(len(arrows)))
        )
        dots = formula(R"\cdots", font_size=60, color=FADED).next_to(estimates[-1], RIGHT, buff=0.6)

        self.play(FadeIn(given))
        self.play(FadeIn(estimates[0], shift=0.2 * DOWN), FadeIn(gap_labels[0]), FadeIn(gap_word))
        for i in range(1, len(values)):
            self.play(
                GrowArrow(arrows[i - 1]),
                FadeIn(times[i - 1]),
                FadeIn(estimates[i], shift=0.2 * LEFT),
                FadeIn(gap_labels[i], shift=0.2 * LEFT),
                run_time=0.9,
            )
        self.play(FadeIn(dots))
        # The held frame: the rule and its numbers, in the middle
        self.play(VGroup(after, given, estimates, arrows, gap_labels, gap_word, times, dots).animate.center(), run_time=1)
        self.wait(3)
