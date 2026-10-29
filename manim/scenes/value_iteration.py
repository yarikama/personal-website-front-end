"""Clips for /learnings/value-iteration."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class GreedyIntoSweep(Clip):
    """One sweep of policy evaluation, with the policy taken greedy on the
    current values: all its weight sits on the best move, so its average
    collapses to a max. That is value iteration's update; the argmax comes
    once, at the end."""

    def construct(self):
        title = words("one sweep of judging a policy", font_size=40, color=FADED)
        title.to_edge(UP, buff=0.45)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        sweep, sp = split_formula(
            "V(s)", R"\leftarrow", R"\sum_a \pi(a \mid s)", R"\sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\, V(s')\,\big]",
            font_size=54,
            t2c={R"\sum_a \pi(a \mid s)": SAGE},
        )
        sweep.next_to(title, DOWN, buff=0.6)
        self.play(Write(sweep), run_time=2)
        self.wait(0.6)

        # Make the policy the greedy one: all its weight on the best move
        greedy = words(R"let $\pi$ be greedy on $V$: weight 1 on the best move, 0 on the rest", font_size=36, color=FADED)
        greedy.next_to(sweep, DOWN, buff=0.5)
        self.play(FadeIn(greedy, shift=0.1 * UP))
        self.wait(1.4)

        vi_title = words("value iteration: judge for one sweep, improve inside it", font_size=40, color=FADED).move_to(title)
        best, bp = split_formula(
            "V(s)", R"\leftarrow", R"\max_a", R"\sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\, V(s')\,\big]",
            font_size=54,
            t2c={R"\max_a": SAGE},
        )
        best.move_to(sweep)
        self.play(
            FadeTransform(title, vi_title),
            FadeTransform(sp[0], bp[0]),
            FadeTransform(sp[1], bp[1]),
            FadeTransform(sp[2], bp[2]),
            FadeTransform(sp[3], bp[3]),
            FadeOut(greedy),
            run_time=2,
        )
        self.play(FlashAround(bp[2], color=SAGE, stroke_width=3))
        self.wait(0.8)

        # Square 7, once the values settle
        seven, vp = split_formula("V(7)", R"\leftarrow", R"\max\big(", R"\underbrace{-6.71}_{\text{roll}}", ",", R"\underbrace{-5.60}_{\text{step}}", R"\big)", "=", "-5.60", font_size=50, t2c={"-5.60": SAGE})
        seven.next_to(best, DOWN, buff=0.6)
        self.play(FadeIn(seven, shift=0.15 * DOWN), run_time=1.6)
        self.wait(1)

        # The moves, read off once at the end
        end = words(R"once $\Delta < \theta$, read off the moves:", font_size=36, color=FADED)
        policy, pp = split_formula(R"\pi(s)", "=", R"\arg\max_a", R"\sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\, V(s')\,\big]", font_size=50, t2c={R"\pi(s)": SAGE})
        VGroup(end, policy).arrange(DOWN, buff=0.3).next_to(seven, DOWN, buff=0.6)
        self.play(FadeIn(end))
        self.play(TransformFromCopy(best, policy), run_time=1.6)
        self.wait(4)
