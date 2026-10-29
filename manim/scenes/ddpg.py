"""Clips for /learnings/ddpg."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words

# The Garamond maths has no partial sign: borrow newtx's
PARTIAL = R"\text{\usefont{OML}{ntxmi}{m}{it}\char64}"
SLOPE = Rf"\frac{{{PARTIAL} Q(s,a)}}{{{PARTIAL} a}}"
SLOPE_AT = SLOPE + R"\Big|_{a=\mu_\theta(s)}"


class MaxToActor(Clip):
    """The deep Q-network's target; its max written as Q at the argmax; the
    argmax handed to an actor network; then frozen copies of both."""

    def construct(self):
        title = words("the target, as in a deep Q-network", font_size=36, color=FADED).to_edge(UP, buff=0.7)
        start, sp = split_formula(
            "y", "=", "r", "+", R"\gamma\,", R"\max_{a'}\,", "Q(s',a')",
            font_size=60,
            t2c={R"\max_{a'}\,": SAGE},
        )
        start.next_to(title, DOWN, buff=0.5)
        self.play(FadeIn(title), Write(start), run_time=2)
        self.wait(0.6)

        # With endless actions, the max is a search nobody can run
        endless = words("with endless actions, this is a search", font_size=34, color=SAGE)
        endless.next_to(sp[5], DOWN, buff=0.7)
        self.play(FadeIn(endless, shift=0.2 * UP))
        self.wait(1.2)

        # The max is Q, evaluated where the max is
        at, ap = split_formula(
            "y", "=", "r", "+", R"\gamma\,", "Q(s',\,", R"\operatorname*{argmax}_{a'} Q(s',a')", ")",
            font_size=60,
            t2c={R"\operatorname*{argmax}_{a'} Q(s',a')": SAGE},
        )
        at.move_to(start)
        same = words("the best value is the value at the best action", font_size=34, color=FADED)
        same.move_to(endless)
        self.play(
            ReplacementTransform(sp[:5], ap[:5]),
            FadeTransform(sp[5], ap[6]),
            ReplacementTransform(sp[6], ap[5]),
            FadeIn(ap[7]),
            FadeTransform(endless, same),
            run_time=2,
        )
        self.wait(1.4)

        # The argmax becomes an actor network that points at it
        actor, cp = split_formula(
            "y", "=", "r", "+", R"\gamma\,", "Q(s',\,", R"\mu(s')", ")",
            font_size=60,
            t2c={R"\mu(s')": SAGE},
        )
        actor.move_to(at)
        learned = words(R"an actor network $\mu$ learns where the best action is", font_size=34, color=SAGE)
        learned.move_to(same)
        self.play(
            ReplacementTransform(ap[:6], cp[:6]),
            FadeTransform(ap[6], cp[6]),
            ReplacementTransform(ap[7], cp[7]),
            FadeTransform(same, learned),
            run_time=2,
        )
        self.wait(1.4)

        # And, as in DQN, frozen copies of both make the target
        final, fp = split_formula(
            "y", "=", "r", "+", R"\gamma\,", R"\bar{Q}(s',\,", R"\bar{\mu}(s')", ")",
            font_size=64,
            t2c={R"\bar{\mu}(s')": SAGE},
        )
        final.move_to(actor)
        copies = words(R"$\bar{Q}$, $\bar{\mu}$: slow copies of the critic and the actor", font_size=34, color=FADED)
        copies.move_to(learned)
        self.play(
            ReplacementTransform(cp[:5], fp[:5]),
            FadeTransform(cp[5], fp[5]),
            FadeTransform(cp[6], fp[6]),
            ReplacementTransform(cp[7], fp[7]),
            FadeTransform(learned, copies),
            FadeOut(title),
            run_time=2,
        )
        self.play(VGroup(final, copies).animate.move_to(DOWN * 0.9))

        # Where it started, above it
        before = formula(R"y = r + \gamma\, \max_{a'}\, Q(s',a')", font_size=52, color=FADED)
        before.move_to(UP * 1.9)
        arrow = Arrow(before.get_bottom(), final.get_top(), buff=0.25, stroke_color=RULE, stroke_width=3)
        self.play(FadeIn(before, shift=0.2 * DOWN), GrowArrow(arrow), run_time=1.2)
        self.wait(3)


class ActorUpdate(Clip):
    """The habit nudged up the feel's slope, in words; then the actor's
    weights nudged by the chain rule; then the story's numbers."""

    def construct(self):
        said, sp = split_words(
            "new setting", R"$\leftarrow$", "setting", "+", "step", R"$\times$", "slope of the critic",
            font_size=38,
        )
        said.to_edge(UP, buff=0.9)
        simple, mp = split_formula(
            "a", R"\leftarrow", "a", "+", R"\beta", SLOPE,
            font_size=60,
            t2c={SLOPE: SAGE},
        )
        simple.next_to(said, DOWN, buff=0.7)
        self.play(Write(said), run_time=2)
        self.wait(0.5)
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), mp[j]) for i, j in [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (6, 5)]), lag_ratio=0.15),
            FadeOut(sp[5]),
            run_time=2,
        )
        self.play(FadeOut(said), simple.animate.to_edge(UP, buff=0.9), run_time=0.9)

        # With the story's numbers: from 30 to 50
        numbers, np_ = split_formula(
            "-0.4", "+", "0.25", R"\times", "1.6", "=", "0",
            font_size=52,
            t2c={"1.6": SAGE},
        )
        numbers.next_to(simple, DOWN, buff=0.7)
        dial = words("on the dial: 30 $\\rightarrow$ 50", font_size=34, color=FADED).next_to(numbers, DOWN, buff=0.35)
        self.play(
            LaggedStart(
                TransformFromCopy(mp[2], np_[0]),
                FadeIn(np_[1]),
                TransformFromCopy(mp[4], np_[2]),
                FadeIn(np_[3]),
                TransformFromCopy(mp[5], np_[4]),
                lag_ratio=0.2,
            ),
            run_time=2,
        )
        self.play(FadeIn(np_[5:]), FadeIn(dial, shift=0.2 * UP))
        self.wait(1.4)

        # But an actor is a network: its weights move, by the chain rule
        chain, cp = split_formula(
            R"\theta", R"\leftarrow", R"\theta", "+", R"\beta",
            SLOPE_AT, R"\nabla_{\theta}\, \mu_\theta(s)",
            font_size=56,
            t2c={SLOPE_AT: SAGE},
        )
        chain.move_to(DOWN * 0.6)
        self.play(FadeOut(numbers), FadeOut(dial), simple.animate.set_fill(FADED), run_time=0.8)
        self.play(Write(chain), run_time=2.2)

        critic_brace = Brace(cp[5], DOWN, buff=0.15).set_fill(SAGE)
        actor_brace = Brace(cp[6], UP, buff=0.15).set_fill(INK)
        critic_says = words(R"the critic:\\which way is better", font_size=34, color=SAGE).next_to(critic_brace, DOWN, buff=0.2)
        actor_says = words(R"the actor:\\which weights move $a$", font_size=34).next_to(actor_brace, UP, buff=0.2)
        self.play(GrowFromCenter(critic_brace), FadeIn(critic_says, shift=0.2 * DOWN))
        self.play(GrowFromCenter(actor_brace), FadeIn(actor_says, shift=0.2 * DOWN))
        self.wait(3)
