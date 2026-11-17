"""Clips for /learnings/lsa."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words

APPROX = R"\mskip\thickmuskip\approx\mskip\thickmuskip"


class WordVectors(Clip):
    """The table kept to its k strongest layers; both sides multiplied by
    V_k; V_kᵀV_k is the identity and drops out, leaving W = C V_k ≈ U_k Σ_k;
    then car's row of counts times V_2 gives its two numbers."""

    def construct(self):
        said = words("the table, kept to its $k$ strongest layers", font_size=38, color=FADED)
        said.to_edge(UP, buff=0.8)

        first, fp = split_formula("C", APPROX, "U_k", R"\Sigma_k", R"V_k^{\top}", font_size=72)
        first.next_to(said, DOWN, buff=0.7)
        self.play(FadeIn(said, shift=0.2 * DOWN), run_time=1.0)
        self.play(Write(first), run_time=1.8)
        self.wait(1.0)

        # Multiply both sides on the right by V_k
        times = words("multiply both sides by $V_k$", font_size=38, color=FADED).move_to(said)
        second, sp = split_formula(
            "C", "V_k", APPROX, "U_k", R"\Sigma_k", R"V_k^{\top}", "V_k",
            font_size=72,
        )
        second.move_to(first)
        sp[1].set_fill(SAGE)
        sp[6].set_fill(SAGE)
        self.play(FadeTransform(said, times), run_time=0.8)
        self.play(
            ReplacementTransform(fp[0], sp[0]),
            ReplacementTransform(fp[1], sp[2]),
            ReplacementTransform(fp[2], sp[3]),
            ReplacementTransform(fp[3], sp[4]),
            ReplacementTransform(fp[4], sp[5]),
            FadeIn(sp[1], shift=0.2 * DOWN),
            FadeIn(sp[6], shift=0.2 * DOWN),
            run_time=1.6,
        )
        self.wait(0.6)

        # The document patterns are at right angles: V_kᵀ V_k is the identity
        brace = Brace(sp[5:7], DOWN, buff=0.15).set_fill(INK)
        why = words(R"$= I$: the patterns\\are at right angles", font_size=36).next_to(brace, DOWN, buff=0.2)
        self.play(GrowFromCenter(brace), FadeIn(why, shift=0.2 * DOWN), run_time=1.0)
        self.wait(1.6)

        third, tp = split_formula("W", "=", "C", "V_k", APPROX, "U_k", R"\Sigma_k", font_size=72)
        third.move_to(first)
        tp[0].set_fill(SAGE)
        self.play(FadeOut(brace), FadeOut(why), FadeOut(sp[5:7]), run_time=0.8)
        self.play(
            ReplacementTransform(sp[0], tp[2]),
            ReplacementTransform(sp[1], tp[3]),
            ReplacementTransform(sp[2], tp[4]),
            ReplacementTransform(sp[3], tp[5]),
            ReplacementTransform(sp[4], tp[6]),
            FadeIn(tp[0:2], shift=0.2 * RIGHT),
            run_time=1.4,
        )
        tp[3].set_fill(INK)
        row = words("row $i$ of $W$: word $i$'s $k$ numbers", font_size=40, color=SAGE)
        row.next_to(third, DOWN, buff=0.6)
        self.play(FadeOut(times), FadeIn(row, shift=0.2 * UP), run_time=1.0)
        self.wait(1.2)

        # Car's row of counts in the twelve sentences, times V_2
        label = words("car", font_size=40, color=FADED)
        car = formula(R"(1,\,1,\,1,\,0,\,\dots,\,0)\,V_2 = (0.92,\ {-0.51})", font_size=56)
        VGroup(label, car).arrange(RIGHT, buff=0.4).next_to(row, DOWN, buff=0.7)
        self.play(FadeIn(label), Write(car), run_time=2.0)
        self.play(VGroup(third, row, label, car).animate.center(), run_time=0.8)
        self.wait(3.0)
