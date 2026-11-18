"""Clips for /learnings/dpo."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words

REF = R"\pi_{\text{ref}}"


def ratio(y: str, star: bool = False) -> str:
    pi = R"\pi^*" if star else R"\pi"
    return Rf"\beta \ln \frac{{{pi}({y})}}{{{REF}({y})}}"


class LeashToLoss(Clip):
    """RLHF's best policy on a leash, read backwards as a score; two such
    scores in the preference rule, where the normaliser cancels; what is
    left is DPO's loss, on the policy alone."""

    def construct(self):
        said = words(R"RLHF's best policy, on a leash of strength $\beta$", font_size=42, color=FADED)
        said.to_edge(UP, buff=1.0)

        best, bp = split_formula(
            R"\pi^*(y)", "=", Rf"\frac{{{REF}(y)\, e^{{r(y)/\beta}}}}{{Z}}",
            font_size=70,
        )
        best.move_to(0.4 * UP)
        self.play(Write(said), run_time=1.4)
        self.play(FadeIn(bp[0:2]), Write(bp[2]), run_time=1.4)
        z = words(R"$Z$ rescales; the same for every answer", font_size=38, color=SAGE)
        z.next_to(best, DOWN, buff=0.4)
        self.play(FadeIn(z, shift=0.2 * DOWN))
        self.wait(1.2)

        # Read it backwards: a policy implies a score
        back, kp = split_formula(
            "r(y)", "=", ratio("y", star=True), "+", R"\beta \ln Z",
            font_size=70,
        )
        back.move_to(best)
        why = words("read it backwards: a score from a policy", font_size=42, color=FADED).move_to(said)
        self.play(FadeOut(z), FadeTransform(said, why), run_time=0.8)
        self.play(
            FadeTransform(bp[0], kp[2]),
            FadeTransform(bp[1], kp[1]),
            FadeTransform(bp[2], VGroup(kp[0], kp[3], kp[4])),
            run_time=1.6,
        )
        self.wait(1.2)

        # A pick compares two scores; Z is shared and cancels
        win, wp = split_formula("r(w)", "=", ratio("w"), "+", R"\beta \ln Z", font_size=64)
        lose, lp = split_formula("r(l)", "=", ratio("l"), "+", R"\beta \ln Z", font_size=64)
        rows = VGroup(win, lose).arrange(DOWN, buff=0.45, aligned_edge=LEFT).move_to(0.2 * DOWN)
        minus = formula("-", font_size=64).next_to(lose, LEFT, buff=0.35)
        pick = words("a pick of $w$ over $l$ compares two scores", font_size=42, color=FADED).move_to(said)
        self.play(FadeTransform(why, pick), run_time=0.8)
        self.play(FadeTransform(back, win), run_time=1.0)
        self.play(TransformFromCopy(win, lose), FadeIn(minus), run_time=1.0)
        self.wait(0.6)
        self.play(wp[4].animate.set_fill(SAGE), lp[4].animate.set_fill(SAGE), run_time=0.6)
        strike = VGroup(
            *(Line(p.get_corner(DL), p.get_corner(UR), stroke_color=SAGE, stroke_width=4) for p in (wp[4], lp[4]))
        )
        cancel = words("cancels in the gap", font_size=38, color=SAGE).next_to(rows, DOWN, buff=0.45)
        self.play(ShowCreation(strike), FadeIn(cancel), run_time=1.0)
        self.wait(1.2)

        # The logistic loss on the gap: DPO
        loss, op = split_formula(
            R"\mathcal{L}", "=", R"-\ln \sigma\Big(", ratio(R"w"), "-", ratio(R"l"), R"\Big)",
            font_size=72,
            t2c={R"\mathcal{L}": SAGE},
        )
        loss.move_to(rows)
        name = words("the logistic loss on the gap: DPO's loss", font_size=42, color=SAGE).move_to(said)
        self.play(FadeTransform(pick, name), FadeOut(cancel), FadeOut(strike), run_time=0.8)
        self.play(
            FadeOut(VGroup(wp[0], wp[1], wp[3], wp[4], lp[0], lp[1], lp[3], lp[4])),
            FadeTransform(wp[2], op[3]),
            FadeTransform(minus, op[4]),
            FadeTransform(lp[2], op[5]),
            FadeIn(VGroup(op[0], op[1], op[2], op[6])),
            run_time=1.6,
        )
        only = words(R"no reward model: only $\pi$ and $\pi_{\text{ref}}$", font_size=38, color=FADED)
        only.next_to(loss, DOWN, buff=0.5)
        self.play(FadeIn(only, shift=0.2 * UP))
        self.play(Indicate(op[0], color=SAGE, scale_factor=1.15))
        self.wait(3)
