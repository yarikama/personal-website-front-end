"""Clips for /learnings/deep-q-networks."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words


class DqnTarget(Clip):
    """Q-learning's target, with a network's weights in it; the update that
    changes those weights; then the target's weights swapped for a frozen
    copy, and the samples drawn from the replay buffer."""

    def construct(self):
        said, sp = split_words(
            "target", "=", "reward", "+", "discount", R"$\times$", "best guess at the next state",
            font_size=38,
        )
        said.to_edge(UP, buff=0.9)

        plain, pp = split_formula(
            "y", "=", "r", "+", R"\gamma\,", R"\max_{a'}\,", "Q(s',a')",
            font_size=60,
        )
        plain.next_to(said, DOWN, buff=0.7)

        self.play(Write(said), run_time=2)
        self.wait(0.6)
        pairs = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (6, 6)]
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), pp[j]) for i, j in pairs), lag_ratio=0.15),
            FadeOut(sp[5]),
            FadeIn(pp[5]),
            run_time=2.2,
        )
        self.play(FadeOut(said), plain.animate.to_edge(UP, buff=1.0), run_time=0.9)

        # A network instead of a table: its guesses carry its weights w
        target, tp = split_formula(
            "y", "=", "r", "+", R"\gamma\,", R"\max_{a'}\,", R"Q(s',a';\,", "w", ")",
            font_size=60,
            t2c={"w": SAGE},
        )
        target.move_to(plain)
        self.play(
            ReplacementTransform(pp[:6], tp[:6]),
            ReplacementTransform(pp[6], tp[6]),
            FadeIn(tp[7:], shift=0.2 * LEFT),
            run_time=1.4,
        )
        net = words("a network, with weights $w$", font_size=34, color=FADED).next_to(target, DOWN, buff=0.35)
        self.play(FadeIn(net, shift=0.2 * UP))
        self.wait(0.8)

        # The update moves w toward the target
        update, up = split_formula(
            "w", R"\leftarrow", "w", "+", R"\alpha", R"\big[", "y", "-", "Q(s,a;w)", R"\big]", R"\nabla_{w} Q(s,a;w)",
            font_size=52,
        )
        update.next_to(target, DOWN, buff=1.3)
        self.play(FadeOut(net), Write(update), run_time=2.2)
        self.wait(0.6)

        # But the target's own w is the one being changed
        changed = SurroundingRectangle(up[0], buff=0.1).set_stroke(SAGE, 2)
        inside = SurroundingRectangle(tp[7], buff=0.1).set_stroke(SAGE, 2)
        same = words("the same $w$: each step moves the target too", font_size=36, color=SAGE)
        same.next_to(update, DOWN, buff=0.6)
        self.play(ShowCreation(changed), ShowCreation(inside))
        self.play(FadeIn(same, shift=0.2 * UP))
        self.wait(1.6)

        # So the target uses a copy that stands still
        frozen, fp = split_formula(
            "y", "=", "r", "+", R"\gamma\,", R"\max_{a'}\,", R"Q(s',a';\,", "w^{-}", ")",
            font_size=60,
            t2c={"w^{-}": SAGE},
        )
        frozen.move_to(target)
        copy = words("a copy of $w$, refreshed every $K$ updates", font_size=36, color=SAGE)
        copy.move_to(same)
        self.play(
            FadeOut(changed), FadeOut(inside),
            ReplacementTransform(tp[:7], fp[:7]),
            FadeTransform(tp[7], fp[7]),
            ReplacementTransform(tp[8], fp[8]),
            FadeTransform(same, copy),
            run_time=1.6,
        )
        self.play(Indicate(fp[7], color=SAGE, scale_factor=1.3))
        self.wait(1)

        # And each sample comes from the replay buffer, at random
        replay = words(R"each $(s, a, r, s')$ drawn at random from the replay buffer", font_size=34, color=FADED)
        replay.to_edge(DOWN, buff=0.8)
        self.play(FadeIn(replay, shift=0.2 * UP))
        self.wait(3)
