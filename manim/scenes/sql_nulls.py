"""Clips for /learnings/sql-nulls."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, split_words, words

NE = R"\mskip\thickmuskip\neq\mskip\thickmuskip"
SP = R"\mskip 9mu"
AND = SP + R"\textsc{and}" + SP
NULL = R"\textsc{null}"


class NotInUnfolds(Clip):
    """NOT IN opened up: 5 differs from 1, and from 3, and from NULL. Each
    comparison becomes a truth value, and one UNKNOWN in the chain is enough
    to make the whole thing UNKNOWN, which WHERE drops. Ana's row, below,
    comes out FALSE."""

    def construct(self):
        query, qp = split_formula(
            "5", SP + R"\textsc{not in}" + SP, "(", "1", R",\,", "3", R",\,", NULL, ")",
            font_size=60,
        )
        unfolded, up = split_formula(
            "5", NE, "1", AND, "5", NE, "3", AND, "5", NE, NULL,
            font_size=54,
        )
        truths, tp = split_formula(
            R"\textsc{true}", AND, R"\textsc{true}", AND, R"\textsc{unknown}",
            font_size=54,
        )
        result, rp = split_formula("=", R"\textsc{unknown}", font_size=60)
        for piece in (qp[7], up[10], tp[4], rp[1]):
            piece.set_fill(SAGE)

        query.to_edge(UP, buff=1.0)
        unfolded.next_to(query, DOWN, buff=0.75)
        truths.next_to(unfolded, DOWN, buff=0.75)
        result.next_to(truths, DOWN, buff=0.6)
        who = words("Eli, id $5$", font_size=34, color=FADED).next_to(query, LEFT, buff=0.6)

        self.play(Write(query), FadeIn(who), run_time=1.8)
        self.wait(0.8)

        # "Not in the list" means "different from each value, all of them"
        self.play(
            LaggedStart(
                TransformFromCopy(qp[0], up[0]),
                FadeIn(up[1]),
                TransformFromCopy(qp[3], up[2]),
                FadeIn(up[3]),
                TransformFromCopy(qp[0], up[4]),
                FadeIn(up[5]),
                TransformFromCopy(qp[5], up[6]),
                FadeIn(up[7]),
                TransformFromCopy(qp[0], up[8]),
                FadeIn(up[9]),
                TransformFromCopy(qp[7], up[10]),
                lag_ratio=0.15,
            ),
            run_time=3,
        )
        self.wait(0.8)

        # Each comparison becomes its truth value; the one with NULL can't be settled
        self.play(
            LaggedStart(
                FadeTransform(up[0:3].copy(), tp[0]),
                FadeTransform(up[3].copy(), tp[1]),
                FadeTransform(up[4:7].copy(), tp[2]),
                FadeTransform(up[7].copy(), tp[3]),
                FadeTransform(up[8:11].copy(), tp[4]),
                lag_ratio=0.3,
            ),
            run_time=3,
        )
        self.wait(0.6)

        # AND of the chain: TRUE can't outvote one UNKNOWN
        self.play(TransformFromCopy(tp[4], rp[1]), FadeIn(rp[0]), run_time=1.5)
        self.play(Indicate(rp[1], color=SAGE, scale_factor=1.15))
        drop = words(R"\textsc{where} keeps only \textsc{true}: Eli is left out", font_size=36)
        drop.next_to(result, DOWN, buff=0.45)
        self.play(FadeIn(drop, shift=0.2 * UP))
        self.wait(1.2)

        # Ana's row: one sure FALSE settles it, UNKNOWN or not
        ana, ap = split_words(
            "Ana, id $1$:",
            R"\textsc{false} \textsc{and} \textsc{true} \textsc{and}",
            R"\textsc{unknown}",
            R"= \textsc{false}",
            font_size=40,
        )
        ap[0].set_fill(FADED)
        ap[2].set_fill(SAGE)
        ana.next_to(drop, DOWN, buff=0.9)
        self.play(FadeIn(ap[0:3], shift=0.2 * UP), run_time=1.2)
        self.play(FadeIn(ap[3], shift=0.2 * LEFT))
        self.wait(3)
