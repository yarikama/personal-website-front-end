"""Clips for /learnings/optimal-policies."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class AverageToBest(Clip):
    """The Bellman equation for a policy turns into the optimality equation:
    the average over the policy's moves becomes the best move. Then the
    numbers for A' and A, and the best policy as the move that reaches the max."""

    def construct(self):
        title = words("a policy's values: the average over its moves", font_size=38, color=FADED)
        title.to_edge(UP, buff=0.4)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        pi_rule, pp = split_formula(
            R"v_\pi(s)", "=", R"\sum_a \pi(a \mid s)", R"\sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\, v_\pi(s')\,\big]",
            font_size=54,
            t2c={R"\sum_a \pi(a \mid s)": SAGE},
        )
        pi_rule.next_to(title, DOWN, buff=0.5)
        self.play(Write(pi_rule), run_time=2.2)
        self.wait(1)

        best_title = words("the best values: the best move instead", font_size=38, color=FADED).move_to(title)
        star, stp = split_formula(
            R"v_*(s)", "=", R"\max_a", R"\sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\, v_*(s')\,\big]",
            font_size=54,
            t2c={R"\max_a": SAGE},
        )
        star.move_to(pi_rule)
        self.play(
            FadeTransform(title, best_title),
            FadeTransform(pp[0], stp[0]),
            FadeTransform(pp[1], stp[1]),
            FadeTransform(pp[2], stp[2]),
            FadeTransform(pp[3], stp[3]),
            run_time=2,
        )
        self.play(FlashAround(stp[2], color=SAGE, stroke_width=3))
        self.wait(1)

        # The numbers for A' and A
        a_, a_p = split_formula(R"v_*(A')", "=", "0", "+", "0.9", R"\times", "17.8", "=", "16.0", font_size=54, t2c={"16.0": SAGE})
        a_.next_to(star, DOWN, buff=0.6)
        north = words("north, the best of four", font_size=30, color=FADED).next_to(a_p[2:7], DOWN, buff=0.15)
        self.play(FadeIn(a_p[:2]), FadeIn(a_p[2:7], shift=0.15 * UP), FadeIn(north))
        self.play(FadeIn(a_p[7:], shift=0.2 * LEFT))
        a, ap = split_formula(R"v_*(A)", "=", "10", "+", "0.9", R"\times", "16.0", "=", "24.4", font_size=54, t2c={"24.4": SAGE})
        a.next_to(north, DOWN, buff=0.35)
        self.play(FadeIn(ap[:6]), TransformFromCopy(a_p[8], ap[6]), run_time=1.3)
        self.play(FadeIn(ap[7:], shift=0.2 * LEFT))
        self.wait(1)

        # The best policy: whichever move reaches the max
        policy, polp = split_formula(
            R"\pi_*(s)", "=", R"\arg\max_a", R"\sum_{s',r} p(s',r \mid s,a)\big[\, r + \gamma\, v_*(s')\,\big]",
            font_size=50,
            t2c={R"\pi_*(s)": SAGE},
        )
        policy.next_to(a, DOWN, buff=0.5)
        self.play(TransformFromCopy(star, policy), run_time=1.6)
        note = words("one step ahead on $v_*$ is enough", font_size=34, color=FADED).next_to(policy, DOWN, buff=0.35)
        self.play(FadeIn(note, shift=0.2 * UP))
        self.wait(4)
