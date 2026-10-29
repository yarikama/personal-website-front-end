"""Clips for /learnings/policy-evaluation."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class EquationToSweep(Clip):
    """The Bellman equation for a policy, a fact about its values, becomes
    an instruction: the equals turns into an arrow. Then square 27, sweep
    by sweep, and the biggest change that says when to stop."""

    def construct(self):
        title = words("a fact about the values, for every state", font_size=40, color=FADED)
        title.to_edge(UP, buff=0.45)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        fact, fp = split_formula(
            R"v_\pi(s)", "=", R"\sum_a \pi(a \mid s) \sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\,", R"v_\pi(s')", R"\,\big]",
            font_size=54,
            t2c={"=": SAGE},
        )
        fact.next_to(title, DOWN, buff=0.6)
        self.play(Write(fact), run_time=2.2)
        count = words(R"$|S|$ equations in $|S|$ unknowns", font_size=36, color=FADED).next_to(fact, DOWN, buff=0.45)
        self.play(FadeIn(count, shift=0.1 * UP))
        self.wait(1.2)

        # The equals becomes an arrow: compute the right side, write it on the left
        rule_title = words("an instruction: compute the right, write it on the left", font_size=40, color=FADED).move_to(title)
        rule, rp = split_formula(
            "V(s)", R"\leftarrow", R"\sum_a \pi(a \mid s) \sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\,", "V(s')", R"\,\big]",
            font_size=54,
            t2c={R"\leftarrow": SAGE},
        )
        rule.move_to(fact)
        self.play(
            FadeTransform(title, rule_title),
            *(FadeTransform(fp[i], rp[i]) for i in range(5)),
            FadeOut(count),
            run_time=2,
        )
        self.play(FlashAround(rp[1], color=SAGE, stroke_width=3))
        self.wait(0.8)

        # Square 27: one roll in six hits the snake to 18, one stops on 29, four finish
        square, sp = split_formula(
            "V(27)", R"\leftarrow", "-1", "+", R"\tfrac{1}{6}\big[\,V(18) + V(29) + 0 + 0 + 0 + 0\,\big]",
            font_size=52,
        )
        square.next_to(rule, DOWN, buff=0.6)
        self.play(FadeIn(square, shift=0.15 * DOWN), run_time=1.2)
        one, op = split_formula(R"\text{sweep 1:\ }", "-1", R"\qquad", R"\text{sweep 2:\ }", R"-1 + \tfrac{1}{6}(-1-1)", "=", "-1.33", font_size=48, t2c={"-1.33": SAGE})
        one.next_to(square, DOWN, buff=0.45)
        self.play(FadeIn(op[:2], shift=0.1 * UP))
        self.play(FadeIn(op[3:], shift=0.1 * UP), run_time=1.4)
        self.wait(1)

        # How much did the sweep still move things?
        delta, dl = split_formula(R"\Delta", R"\leftarrow", R"\max\big(\Delta,\ |\,v - V(s)\,|\big)", font_size=52, t2c={R"\Delta": SAGE})
        delta.next_to(one, DOWN, buff=0.6)
        until = words(R"sweep again until $\Delta < \theta$", font_size=38, color=SAGE).next_to(delta, DOWN, buff=0.35)
        self.play(Write(delta), run_time=1.4)
        self.play(FadeIn(until, shift=0.1 * UP))
        self.wait(4)
