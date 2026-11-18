"""Clips for /learnings/gans."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class GameValue(Clip):
    """The game's score in words, then in symbols; who pushes it which way;
    and what it comes to once the cashier can only guess."""

    def construct(self):
        sp = VGroup(
            words("average log of the chance real coins are called real", font_size=36),
            words("+", font_size=36),
            words("average log of the chance fakes are called fake", font_size=36, color=SAGE),
        ).arrange(DOWN, buff=0.25)
        said = sp
        value, vp = split_formula(
            "V", "=", R"\mathbb{E}_x\big[\log D(x)\big]", "+", R"\mathbb{E}_z\big[\log\big(1 - D(G(z))\big)\big]",
            font_size=54,
            t2c={R"\mathbb{E}_z\big[\log\big(1 - D(G(z))\big)\big]": SAGE},
        )
        said.to_edge(UP, buff=1.0)
        value.next_to(said, DOWN, buff=0.9)

        self.play(Write(said), run_time=3)
        self.wait(0.8)
        self.play(
            FadeIn(vp[0:2]),
            FadeTransform(sp[0], vp[2]),
            FadeTransform(sp[1], vp[3]),
            FadeTransform(sp[2], vp[4]),
            run_time=2.5,
        )
        self.play(value.animate.to_edge(UP, buff=1.0), run_time=1)

        # Who pushes which way
        up = Brace(vp[2:], DOWN, buff=0.2).set_fill(INK)
        up_says = words("the discriminator D pushes it up", font_size=36).next_to(up, DOWN, buff=0.2)
        self.play(GrowFromCenter(up), FadeIn(up_says, shift=0.2 * DOWN))
        self.wait(1)
        down = Brace(vp[4], DOWN, buff=0.2).set_fill(SAGE)
        down_says = words(R"the generator G only moves this part,\\and pushes it down", font_size=36, color=SAGE)
        down_says.next_to(down, DOWN, buff=0.2)
        self.play(FadeOut(up_says), run_time=0.6)
        self.play(ReplacementTransform(up, down), FadeIn(down_says, shift=0.2 * DOWN), run_time=1.2)
        self.wait(1.2)
        game = formula(R"\min_G\,\max_D\; V", font_size=56).next_to(down_says, DOWN, buff=0.6)
        self.play(FadeIn(game, shift=0.2 * UP))
        self.wait(1.2)

        # Once the fakes match, D can only say one half
        self.play(FadeOut(VGroup(down, down_says, game)))
        even, ep = split_formula(
            "V", "=", R"\log\tfrac12", "+", R"\log\tfrac12", "=", R"-\log 4", R"\mskip\thickmuskip\approx\mskip\thickmuskip", "{-1.39}",
            font_size=58,
            t2c={"{-1.39}": SAGE},
        )
        even.move_to(DOWN * 0.6)
        note = words(R"at the end, $D = \tfrac12$ on every coin", font_size=36, color=FADED).next_to(even, UP, buff=0.6)
        self.play(FadeIn(note))
        self.play(
            TransformFromCopy(vp[0:2], ep[0:2]),
            TransformFromCopy(vp[2], ep[2]),
            TransformFromCopy(vp[3], ep[3]),
            TransformFromCopy(vp[4], ep[4]),
            run_time=2,
        )
        self.play(FadeIn(ep[5:7], shift=0.2 * LEFT))
        self.play(FadeIn(ep[7:], shift=0.2 * LEFT))
        self.wait(3)


class Saturation(Clip):
    """How hard each of the generator's two losses pushes a fake, through
    the discriminator's score s: the original by D, the other by 1 − D."""

    def construct(self):
        setup = words(R"$D = \sigma(s)$: the chance real, from the score $s$", font_size=38, color=FADED)
        setup.to_edge(UP, buff=0.8)

        orig, op = split_formula(
            R"\frac{d}{ds}", R"\log(1 - D)", "=", "-D",
            font_size=60,
        )
        ns, np_ = split_formula(
            R"\frac{d}{ds}", R"\big(-\log D\big)", "=", R"-(1 - D)",
            font_size=60,
            t2c={R"-(1 - D)": SAGE},
        )
        orig.move_to(UP * 1.2 + LEFT * 0.2)
        ns.next_to(orig, DOWN, buff=0.7)
        ns.align_to(orig, LEFT)
        orig_name = words("original", font_size=34, color=FADED).next_to(orig, LEFT, buff=0.5)
        ns_name = words("non-saturating", font_size=34, color=SAGE).next_to(ns, LEFT, buff=0.5)
        for name in (orig_name, ns_name):
            name.align_to(orig_name, RIGHT)

        self.play(FadeIn(setup))
        self.play(Write(op[0:2]), FadeIn(orig_name), run_time=1.5)
        self.play(FadeIn(op[2:], shift=0.2 * LEFT))
        self.wait(1.4)
        self.play(Write(np_[0:2]), FadeIn(ns_name), run_time=1.5)
        self.play(FadeIn(np_[2:], shift=0.2 * LEFT))
        self.wait(1)

        # A fake the discriminator catches: D = 0.1
        caught = words(R"a fake the discriminator catches: $D = 0.1$", font_size=38).next_to(ns, DOWN, buff=0.8)
        caught.set_x(0)
        self.play(FadeIn(caught, shift=0.2 * UP))
        small = formula("-0.1", font_size=60).move_to(op[3], LEFT)
        big = formula("-0.9", font_size=60, color=SAGE).move_to(np_[3], LEFT)
        self.play(Transform(op[3], small), Transform(np_[3], big), run_time=1.5)
        self.wait(0.6)
        nine = words(R"nine times the push, just when it is needed", font_size=40, color=SAGE)
        nine.next_to(caught, DOWN, buff=0.5)
        self.play(FadeIn(nine, shift=0.2 * UP))
        self.wait(4)
