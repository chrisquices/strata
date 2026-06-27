/* esm.sh - @internationalized/date@3.12.2 */
var fr = a => {
    throw TypeError(a)
};
var W = (a, e, r) => e.has(a) ? fr("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(a) : e.set(a, r);

function D(a, e) {
    return a - e * Math.floor(a / e)
}

var $a = 1721426;

function w(a, e, r, t) {
    e = T(a, e);
    let n = e - 1, o = -2;
    return r <= 2 ? o = 0 : g(e) && (o = -1), $a - 1 + 365 * n + Math.floor(n / 4) - Math.floor(n / 100) + Math.floor(n / 400) + Math.floor((367 * r - 362) / 12 + o + t)
}

function g(a) {
    return a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0)
}

function T(a, e) {
    return a === "BC" ? 1 - e : e
}

function Y(a) {
    let e = "AD";
    return a <= 0 && (e = "BC", a = 1 - a), [e, a]
}

var $r = {
    standard: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    leapyear: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
}, $ = class {
    fromJulianDay(e) {
        let r = e, t = r - $a, n = Math.floor(t / 146097), o = D(t, 146097), s = Math.floor(o / 36524), c = D(o, 36524),
            i = Math.floor(c / 1461), l = D(c, 1461), U = Math.floor(l / 365),
            Z = n * 400 + s * 100 + i * 4 + U + (s !== 4 && U !== 4 ? 1 : 0), [J, S] = Y(Z), I = r - w(J, S, 1, 1),
            Te = 2;
        r < w(J, S, 3, 1) ? Te = 0 : g(S) && (Te = 1);
        let fa = Math.floor(((I + Te) * 12 + 373) / 367), dr = r - w(J, S, fa, 1) + 1;
        return new f(J, S, fa, dr)
    }

    toJulianDay(e) {
        return w(e.era, e.year, e.month, e.day)
    }

    getDaysInMonth(e) {
        return $r[g(e.year) ? "leapyear" : "standard"][e.month - 1]
    }

    getMonthsInYear(e) {
        return 12
    }

    getDaysInYear(e) {
        return g(e.year) ? 366 : 365
    }

    getMaximumMonthsInYear() {
        return 12
    }

    getMaximumDaysInMonth() {
        return 31
    }

    getYearsInEra(e) {
        return 9999
    }

    getEras() {
        return ["BC", "AD"]
    }

    isInverseEra(e) {
        return e.era === "BC"
    }

    balanceDate(e) {
        e.year <= 0 && (e.era = e.era === "BC" ? "AD" : "BC", e.year = 1 - e.year)
    }

    constructor() {
        this.identifier = "gregory"
    }
};
var la = {
    "001": 1,
    AD: 1,
    AE: 6,
    AF: 6,
    AI: 1,
    AL: 1,
    AM: 1,
    AN: 1,
    AR: 1,
    AT: 1,
    AU: 1,
    AX: 1,
    AZ: 1,
    BA: 1,
    BE: 1,
    BG: 1,
    BH: 6,
    BM: 1,
    BN: 1,
    BY: 1,
    CH: 1,
    CL: 1,
    CM: 1,
    CN: 1,
    CR: 1,
    CY: 1,
    CZ: 1,
    DE: 1,
    DJ: 6,
    DK: 1,
    DZ: 6,
    EC: 1,
    EE: 1,
    EG: 6,
    ES: 1,
    FI: 1,
    FJ: 1,
    FO: 1,
    FR: 1,
    GB: 1,
    GE: 1,
    GF: 1,
    GP: 1,
    GR: 1,
    HR: 1,
    HU: 1,
    IE: 1,
    IQ: 6,
    IR: 6,
    IS: 1,
    IT: 1,
    JO: 6,
    KG: 1,
    KW: 6,
    KZ: 1,
    LB: 1,
    LI: 1,
    LK: 1,
    LT: 1,
    LU: 1,
    LV: 1,
    LY: 6,
    MC: 1,
    MD: 1,
    ME: 1,
    MK: 1,
    MN: 1,
    MQ: 1,
    MV: 5,
    MY: 1,
    NL: 1,
    NO: 1,
    NZ: 1,
    OM: 6,
    PL: 1,
    QA: 6,
    RE: 1,
    RO: 1,
    RS: 1,
    RU: 1,
    SD: 6,
    SE: 1,
    SI: 1,
    SK: 1,
    SM: 1,
    SY: 6,
    TJ: 1,
    TM: 1,
    TR: 1,
    UA: 1,
    UY: 1,
    UZ: 1,
    VA: 1,
    VN: 1,
    XK: 1
};

function Se(a, e) {
    return e = u(e, a.calendar), a.era === e.era && a.year === e.year && a.month === e.month && a.day === e.day
}

function ma(a, e) {
    return e = u(e, a.calendar), a = H(a), e = H(e), a.era === e.era && a.year === e.year && a.month === e.month
}

function pa(a, e) {
    return e = u(e, a.calendar), a = Ae(a), e = Ae(e), a.era === e.era && a.year === e.year
}

function lr(a, e) {
    return k(a.calendar, e.calendar) && Se(a, e)
}

function ur(a, e) {
    return k(a.calendar, e.calendar) && ma(a, e)
}

function hr(a, e) {
    return k(a.calendar, e.calendar) && pa(a, e)
}

function k(a, e) {
    return a.isEqual?.(e) ?? e.isEqual?.(a) ?? a.identifier === e.identifier
}

function mr(a, e) {
    return Se(a, ba(e))
}

var pr = {sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6};

function Ye(a, e, r) {
    let t = a.calendar.toJulianDay(a), n = r ? pr[r] : Ir(e), o = Math.ceil(t + 1 - n) % 7;
    return o < 0 && (o += 7), o
}

function ya(a) {
    return m(Date.now(), a)
}

function ba(a) {
    return Re(ya(a))
}

function ve(a, e) {
    return a.calendar.toJulianDay(a) - e.calendar.toJulianDay(e)
}

function Oe(a, e) {
    return ua(a) - ua(e)
}

function ua(a) {
    return a.hour * 36e5 + a.minute * 6e4 + a.second * 1e3 + a.millisecond
}

function yr(a, e) {
    let r = h(a, e), t = a.add({days: 1});
    return (h(t, e) - r) / 36e5
}

var G = null, Be = !1;

function E() {
    return G == null && (G = new Intl.DateTimeFormat().resolvedOptions().timeZone), G
}

function br(a) {
    Be = !0, G = a
}

function Dr() {
    Be = !1, G = null
}

function Le() {
    return Be
}

function H(a) {
    return a.subtract({days: a.day - 1})
}

function Da(a) {
    return a.add({days: a.calendar.getDaysInMonth(a) - a.day})
}

function Ae(a) {
    return H(a.subtract({months: a.month - 1}))
}

function gr(a) {
    return Da(a.add({months: a.calendar.getMonthsInYear(a) - a.month}))
}

function xr(a) {
    return a.calendar.getMinimumMonthInYear ? a.calendar.getMinimumMonthInYear(a) : 1
}

function Mr(a) {
    return a.calendar.getMinimumDayInMonth ? a.calendar.getMinimumDayInMonth(a) : 1
}

function ga(a, e, r) {
    let t = Ye(a, e, r);
    return a.subtract({days: t})
}

function Cr(a, e, r) {
    return ga(a, e, r).add({days: 6})
}

var ha = new Map, Ee = new Map;

function xa(a) {
    if (Intl.Locale) {
        let r = ha.get(a);
        return r || (r = new Intl.Locale(a).maximize().region, r && ha.set(a, r)), r
    }
    let e = a.split("-")[1];
    return e === "u" ? void 0 : e
}

function Ir(a) {
    let e = Ee.get(a);
    if (!e) {
        if (Intl.Locale) {
            let t = new Intl.Locale(a);
            if ("getWeekInfo" in t && (e = t.getWeekInfo(), e)) return Ee.set(a, e), e.firstDay
        }
        let r = xa(a);
        if (a.includes("-fw-")) {
            let t = a.split("-fw-")[1].split("-")[0];
            t === "mon" ? e = {firstDay: 1} : t === "tue" ? e = {firstDay: 2} : t === "wed" ? e = {firstDay: 3} : t === "thu" ? e = {firstDay: 4} : t === "fri" ? e = {firstDay: 5} : t === "sat" ? e = {firstDay: 6} : e = {firstDay: 0}
        } else a.includes("-ca-iso8601") ? e = {firstDay: 1} : e = {firstDay: r && la[r] || 0};
        Ee.set(a, e)
    }
    return e.firstDay
}

function wr(a, e, r) {
    let t = a.calendar.getDaysInMonth(a);
    return Math.ceil((Ye(H(a), e, r) + t) / 7)
}

function Tr(a, e) {
    return a && e ? a.compare(e) <= 0 ? a : e : a || e
}

function Er(a, e) {
    return a && e ? a.compare(e) >= 0 ? a : e : a || e
}

var Ar = {
    AF: [4, 5],
    AE: [5, 6],
    BH: [5, 6],
    DZ: [5, 6],
    EG: [5, 6],
    IL: [5, 6],
    IQ: [5, 6],
    IR: [5, 5],
    JO: [5, 6],
    KW: [5, 6],
    LY: [5, 6],
    OM: [5, 6],
    QA: [5, 6],
    SA: [5, 6],
    SD: [5, 6],
    SY: [5, 6],
    YE: [5, 6]
};

function Ma(a, e) {
    let r = a.calendar.toJulianDay(a), t = Math.ceil(r + 1) % 7;
    t < 0 && (t += 7);
    let n = xa(e), [o, s] = Ar[n] || [6, 0];
    return t === o || t === s
}

function Sr(a, e) {
    return !Ma(a, e)
}

function b(a) {
    a = u(a, new $);
    let e = T(a.era, a.year);
    return Ia(e, a.month, a.day, a.hour, a.minute, a.second, a.millisecond)
}

function Ia(a, e, r, t, n, o, s) {
    let c = new Date;
    return c.setUTCHours(t, n, o, s), c.setUTCFullYear(a, e - 1, r), c.getTime()
}

function N(a, e) {
    if (e === "UTC") return 0;
    if (a > 0 && e === E() && !Le()) return new Date(a).getTimezoneOffset() * -6e4;
    let {year: r, month: t, day: n, hour: o, minute: s, second: c} = wa(a, e);
    return Ia(r, t, n, o, s, c, 0) - Math.floor(a / 1e3) * 1e3
}

var Ca = new Map;

function wa(a, e) {
    let r = Ca.get(e);
    r || (r = new Intl.DateTimeFormat("en-US", {
        timeZone: e,
        hour12: !1,
        era: "short",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
    }), Ca.set(e, r));
    let t = r.formatToParts(new Date(a)), n = {};
    for (let o of t) o.type !== "literal" && (n[o.type] = o.value);
    return {
        year: n.era === "BC" || n.era === "B" ? -n.year + 1 : +n.year,
        month: +n.month,
        day: +n.day,
        hour: n.hour === "24" ? 0 : +n.hour,
        minute: +n.minute,
        second: +n.second
    }
}

var de = 864e5;

function Ta(a, e) {
    let r = b(a), t = r - N(r - de, e), n = r - N(r + de, e);
    return Ea(a, e, t, n)
}

function Ea(a, e, r, t) {
    return (r === t ? [r] : [r, t]).filter(o => Yr(a, e, o))
}

function Yr(a, e, r) {
    let t = wa(r, e);
    return a.year === t.year && a.month === t.month && a.day === t.day && a.hour === t.hour && a.minute === t.minute && a.second === t.second
}

function h(a, e, r = "compatible") {
    let t = p(a);
    if (e === "UTC") return b(t);
    if (e === E() && r === "compatible" && !Le()) {
        t = u(t, new $);
        let i = new Date, l = T(t.era, t.year);
        return i.setFullYear(l, t.month - 1, t.day), i.setHours(t.hour, t.minute, t.second, t.millisecond), i.getTime()
    }
    let n = b(t), o = N(n - de, e), s = N(n + de, e), c = Ea(t, e, n - o, n - s);
    if (c.length === 1) return c[0];
    if (c.length > 1) switch (r) {
        case"compatible":
        case"earlier":
            return c[0];
        case"later":
            return c[c.length - 1];
        case"reject":
            throw new RangeError("Multiple possible absolute times found")
    }
    switch (r) {
        case"earlier":
            return Math.min(n - o, n - s);
        case"compatible":
        case"later":
            return Math.max(n - o, n - s);
        case"reject":
            throw new RangeError("No such absolute time found")
    }
}

function Ue(a, e, r = "compatible") {
    return new Date(h(a, e, r))
}

function m(a, e) {
    let r = N(a, e), t = new Date(a + r), n = t.getUTCFullYear(), o = t.getUTCMonth() + 1, s = t.getUTCDate(),
        c = t.getUTCHours(), i = t.getUTCMinutes(), l = t.getUTCSeconds(), U = t.getUTCMilliseconds();
    return new M(n < 1 ? "BC" : "AD", n < 1 ? -n + 1 : n, o, s, e, r, c, i, l, U)
}

function Aa(a, e) {
    return m(a.getTime(), e)
}

function vr(a) {
    return Aa(a, E())
}

function Re(a) {
    return new f(a.calendar, a.era, a.year, a.month, a.day)
}

function p(a, e) {
    let r = 0, t = 0, n = 0, o = 0;
    if ("timeZone" in a) ({hour: r, minute: t, second: n, millisecond: o} = a); else if ("hour" in a && !e) return a;
    return e && ({
        hour: r,
        minute: t,
        second: n,
        millisecond: o
    } = e), new O(a.calendar, a.era, a.year, a.month, a.day, r, t, n, o)
}

function Or(a) {
    return new v(a.hour, a.minute, a.second, a.millisecond)
}

function u(a, e) {
    if (k(a.calendar, e)) return a;
    let r = e.fromJulianDay(a.calendar.toJulianDay(a)), t = a.copy();
    return t.calendar = e, t.era = r.era, t.year = r.year, t.month = r.month, t.day = r.day, x(t), t
}

function Ze(a, e, r) {
    if (a instanceof M) return a.timeZone === e ? a : P(a, e);
    let t = h(a, e, r);
    return m(t, e)
}

function Sa(a) {
    let e = b(a) - a.offset;
    return new Date(e)
}

function P(a, e) {
    let r = b(a) - a.offset;
    return u(m(r, e), a.calendar)
}

function Br(a) {
    return P(a, E())
}

var V = 36e5;

function K(a, e) {
    let r = a.copy(), t = "hour" in r ? va(r, e) : 0;
    Je(r, e.years || 0), r.calendar.balanceYearMonth && r.calendar.balanceYearMonth(r, a), r.month += e.months || 0, ke(r), Ya(r), r.day += (e.weeks || 0) * 7, r.day += e.days || 0, r.day += t, Lr(r), r.calendar.balanceDate && r.calendar.balanceDate(r), r.year < 1 && (r.year = 1, r.month = 1, r.day = 1);
    let n = r.calendar.getYearsInEra(r);
    if (r.year > n) {
        let s = r.calendar.isInverseEra?.(r);
        r.year = n, r.month = s ? 1 : r.calendar.getMonthsInYear(r), r.day = s ? 1 : r.calendar.getDaysInMonth(r)
    }
    r.month < 1 && (r.month = 1, r.day = 1);
    let o = r.calendar.getMonthsInYear(r);
    return r.month > o && (r.month = o, r.day = r.calendar.getDaysInMonth(r)), r.day = Math.max(1, Math.min(r.calendar.getDaysInMonth(r), r.day)), r
}

function Je(a, e) {
    a.calendar.isInverseEra?.(a) && (e = -e), a.year += e
}

function ke(a) {
    for (; a.month < 1;) Je(a, -1), a.month += a.calendar.getMonthsInYear(a);
    let e = 0;
    for (; a.month > (e = a.calendar.getMonthsInYear(a));) a.month -= e, Je(a, 1)
}

function Lr(a) {
    for (; a.day < 1;) a.month--, ke(a), a.day += a.calendar.getDaysInMonth(a);
    for (; a.day > a.calendar.getDaysInMonth(a);) a.day -= a.calendar.getDaysInMonth(a), a.month++, ke(a)
}

function Ya(a) {
    a.month = Math.max(1, Math.min(a.calendar.getMonthsInYear(a), a.month)), a.day = Math.max(1, Math.min(a.calendar.getDaysInMonth(a), a.day))
}

function x(a) {
    a.calendar.constrainDate && a.calendar.constrainDate(a), a.year = Math.max(1, Math.min(a.calendar.getYearsInEra(a), a.year)), Ya(a)
}

function qe(a) {
    let e = {};
    for (let r in a) typeof a[r] == "number" && (e[r] = -a[r]);
    return e
}

function Fe(a, e) {
    return K(a, qe(e))
}

function $e(a, e) {
    let r = a.copy();
    return e.era != null && (r.era = e.era), e.year != null && (r.year = e.year), e.month != null && (r.month = e.month), e.day != null && (r.day = e.day), x(r), r
}

function q(a, e) {
    let r = a.copy();
    return e.hour != null && (r.hour = e.hour), e.minute != null && (r.minute = e.minute), e.second != null && (r.second = e.second), e.millisecond != null && (r.millisecond = e.millisecond), _e(r), r
}

function Rr(a) {
    a.second += Math.floor(a.millisecond / 1e3), a.millisecond = fe(a.millisecond, 1e3), a.minute += Math.floor(a.second / 60), a.second = fe(a.second, 60), a.hour += Math.floor(a.minute / 60), a.minute = fe(a.minute, 60);
    let e = Math.floor(a.hour / 24);
    return a.hour = fe(a.hour, 24), e
}

function _e(a) {
    a.millisecond = Math.max(0, Math.min(a.millisecond, 1e3)), a.second = Math.max(0, Math.min(a.second, 59)), a.minute = Math.max(0, Math.min(a.minute, 59)), a.hour = Math.max(0, Math.min(a.hour, 23))
}

function fe(a, e) {
    let r = a % e;
    return r < 0 && (r += e), r
}

function va(a, e) {
    return a.hour += e.hours || 0, a.minute += e.minutes || 0, a.second += e.seconds || 0, a.millisecond += e.milliseconds || 0, Rr(a)
}

function Qe(a, e) {
    let r = a.copy();
    return va(r, e), r
}

function Oa(a, e) {
    return Qe(a, qe(e))
}

function le(a, e, r, t) {
    let n = a.copy();
    switch (e) {
        case"era": {
            let o = a.calendar.getEras(), s = o.indexOf(a.era);
            if (s < 0) throw new Error("Invalid era: " + a.era);
            s = C(s, r, 0, o.length - 1, t?.round), n.era = o[s], x(n);
            break
        }
        case"year":
            n.calendar.isInverseEra?.(n) && (r = -r), n.year = C(a.year, r, -1 / 0, 9999, t?.round), n.year === -1 / 0 && (n.year = 1), n.calendar.balanceYearMonth && n.calendar.balanceYearMonth(n, a);
            break;
        case"month":
            n.month = C(a.month, r, 1, a.calendar.getMonthsInYear(a), t?.round);
            break;
        case"day":
            n.day = C(a.day, r, 1, a.calendar.getDaysInMonth(a), t?.round);
            break;
        default:
            throw new Error("Unsupported field " + e)
    }
    return a.calendar.balanceDate && a.calendar.balanceDate(n), x(n), n
}

function ue(a, e, r, t) {
    let n = a.copy();
    switch (e) {
        case"hour": {
            let o = a.hour, s = 0, c = 23;
            if (t?.hourCycle === 12) {
                let i = o >= 12;
                s = i ? 12 : 0, c = i ? 23 : 11
            }
            n.hour = C(o, r, s, c, t?.round);
            break
        }
        case"minute":
            n.minute = C(a.minute, r, 0, 59, t?.round);
            break;
        case"second":
            n.second = C(a.second, r, 0, 59, t?.round);
            break;
        case"millisecond":
            n.millisecond = C(a.millisecond, r, 0, 999, t?.round);
            break;
        default:
            throw new Error("Unsupported field " + e)
    }
    return n
}

function C(a, e, r, t, n = !1) {
    if (n) {
        a += Math.sign(e), a < r && (a = t);
        let o = Math.abs(e);
        e > 0 ? a = Math.ceil(a / o) * o : a = Math.floor(a / o) * o, a > t && (a = r)
    } else a += e, a < r ? a = t - (r - a - 1) : a > t && (a = r + (a - t - 1));
    return a
}

function We(a, e) {
    let r;
    if (e.years != null && e.years !== 0 || e.months != null && e.months !== 0 || e.weeks != null && e.weeks !== 0 || e.days != null && e.days !== 0) {
        let n = K(p(a), {years: e.years, months: e.months, weeks: e.weeks, days: e.days});
        r = h(n, a.timeZone)
    } else r = b(a) - a.offset;
    r += e.milliseconds || 0, r += (e.seconds || 0) * 1e3, r += (e.minutes || 0) * 6e4, r += (e.hours || 0) * 36e5;
    let t = m(r, a.timeZone);
    return u(t, a.calendar)
}

function Ba(a, e) {
    return We(a, qe(e))
}

function La(a, e, r, t) {
    switch (e) {
        case"hour": {
            let n = 0, o = 23;
            if (t?.hourCycle === 12) {
                let I = a.hour >= 12;
                n = I ? 12 : 0, o = I ? 23 : 11
            }
            let s = p(a), c = u(q(s, {hour: n}), new $),
                i = [h(c, a.timeZone, "earlier"), h(c, a.timeZone, "later")].filter(I => m(I, a.timeZone).day === c.day)[0],
                l = u(q(s, {hour: o}), new $),
                U = [h(l, a.timeZone, "earlier"), h(l, a.timeZone, "later")].filter(I => m(I, a.timeZone).day === l.day).pop(),
                Z = b(a) - a.offset, J = Math.floor(Z / V), S = Z % V;
            return Z = C(J, r, Math.floor(i / V), Math.floor(U / V), t?.round) * V + S, u(m(Z, a.timeZone), a.calendar)
        }
        case"minute":
        case"second":
        case"millisecond":
            return ue(a, e, r, t);
        case"era":
        case"year":
        case"month":
        case"day": {
            let n = le(p(a), e, r, t), o = h(n, a.timeZone);
            return u(m(o, a.timeZone), a.calendar)
        }
        default:
            throw new Error("Unsupported field " + e)
    }
}

function Ra(a, e, r) {
    let t = p(a), n = q($e(t, e), e);
    if (n.compare(t) === 0) return a;
    let o = h(n, a.timeZone, r);
    return u(m(o, a.timeZone), a.calendar)
}

var Ur = /^(\d{2})(?::(\d{2}))?(?::(\d{2}))?(\.\d+)?$/, Zr = /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})$/,
    Jr = /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})(?:T(\d{2}))?(?::(\d{2}))?(?::(\d{2}))?(\.\d+)?$/,
    kr = /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})(?:T(\d{2}))?(?::(\d{2}))?(?::(\d{2}))?(\.\d+)?(?:([+-]\d{2})(?::?(\d{2}))?(?::?(\d{2}))?)?\[(.*?)\]$/,
    Ge = /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})(?:T(\d{2}))?(?::(\d{2}))?(?::(\d{2}))?(\.\d+)?(?:(?:([+-]\d{2})(?::?(\d{2}))?)|Z)$/,
    qr = /^((?<negative>-)|\+)?P((?<years>\d*)Y)?((?<months>\d*)M)?((?<weeks>\d*)W)?((?<days>\d*)D)?((?<time>T)((?<hours>\d*[.,]?\d{1,9})H)?((?<minutes>\d*[.,]?\d{1,9})M)?((?<seconds>\d*[.,]?\d{1,9})S)?)?$/,
    Ua = ["hours", "minutes", "seconds"], Fr = ["years", "months", "weeks", "days", ...Ua];

function _r(a) {
    let e = a.match(Ur);
    if (!e) throw new Error("Invalid ISO 8601 time string: " + a);
    return new v(d(e[1], 0, 23), e[2] ? d(e[2], 0, 59) : 0, e[3] ? d(e[3], 0, 59) : 0, e[4] ? d(e[4], 0, 1 / 0) * 1e3 : 0)
}

function Qr(a) {
    let e = a.match(Zr);
    if (!e) throw Ge.test(a) ? new Error(`Invalid ISO 8601 date string: ${a}. Use parseAbsolute() instead.`) : new Error("Invalid ISO 8601 date string: " + a);
    let r = new f(d(e[1], 0, 9999), d(e[2], 1, 12), 1);
    return r.day = d(e[3], 1, r.calendar.getDaysInMonth(r)), r
}

function Wr(a) {
    let e = a.match(Jr);
    if (!e) throw Ge.test(a) ? new Error(`Invalid ISO 8601 date time string: ${a}. Use parseAbsolute() instead.`) : new Error("Invalid ISO 8601 date time string: " + a);
    let r = d(e[1], -9999, 9999), t = r < 1 ? "BC" : "AD",
        n = new O(t, r < 1 ? -r + 1 : r, d(e[2], 1, 12), 1, e[4] ? d(e[4], 0, 23) : 0, e[5] ? d(e[5], 0, 59) : 0, e[6] ? d(e[6], 0, 59) : 0, e[7] ? d(e[7], 0, 1 / 0) * 1e3 : 0);
    return n.day = d(e[3], 0, n.calendar.getDaysInMonth(n)), n
}

function Gr(a, e) {
    let r = a.match(kr);
    if (!r) throw new Error("Invalid ISO 8601 date time string: " + a);
    let t = d(r[1], -9999, 9999), n = t < 1 ? "BC" : "AD",
        o = new M(n, t < 1 ? -t + 1 : t, d(r[2], 1, 12), 1, r[11], 0, r[4] ? d(r[4], 0, 23) : 0, r[5] ? d(r[5], 0, 59) : 0, r[6] ? d(r[6], 0, 59) : 0, r[7] ? d(r[7], 0, 1 / 0) * 1e3 : 0);
    o.day = d(r[3], 0, o.calendar.getDaysInMonth(o));
    let s = p(o), c;
    if (r[8]) {
        let i = d(r[8], -23, 23);
        if (o.offset = Math.sign(i) * (Math.abs(i) * 36e5 + d(r[9] ?? "0", 0, 59) * 6e4 + d(r[10] ?? "0", 0, 59) * 1e3), c = b(o) - o.offset, !Ta(s, o.timeZone).includes(c)) throw new Error(`Offset ${Ja(o.offset)} is invalid for ${he(o)} in ${o.timeZone}`)
    } else c = h(p(s), o.timeZone, e);
    return m(c, o.timeZone)
}

function Za(a, e) {
    let r = a.match(Ge);
    if (!r) throw new Error("Invalid ISO 8601 date time string: " + a);
    let t = d(r[1], -9999, 9999), n = t < 1 ? "BC" : "AD",
        o = new M(n, t < 1 ? -t + 1 : t, d(r[2], 1, 12), 1, e, 0, r[4] ? d(r[4], 0, 23) : 0, r[5] ? d(r[5], 0, 59) : 0, r[6] ? d(r[6], 0, 59) : 0, r[7] ? d(r[7], 0, 1 / 0) * 1e3 : 0);
    return o.day = d(r[3], 0, o.calendar.getDaysInMonth(o)), r[8] && (o.offset = d(r[8], -23, 23) * 36e5 + d(r[9] ?? "0", 0, 59) * 6e4), P(o, e)
}

function Hr(a) {
    return Za(a, E())
}

function d(a, e, r) {
    let t = Number(a);
    if (t < e || t > r) throw new RangeError(`Value out of range: ${e} <= ${t} <= ${r}`);
    return t
}

function He(a) {
    return `${String(a.hour).padStart(2, "0")}:${String(a.minute).padStart(2, "0")}:${String(a.second).padStart(2, "0")}${a.millisecond ? String(a.millisecond / 1e3).slice(1) : ""}`
}

function Ne(a) {
    let e = u(a, new $), r;
    return e.era === "BC" ? r = e.year === 1 ? "0000" : "-" + String(Math.abs(1 - e.year)).padStart(6, "00") : r = String(e.year).padStart(4, "0"), `${r}-${String(e.month).padStart(2, "0")}-${String(e.day).padStart(2, "0")}`
}

function he(a) {
    return `${Ne(a)}T${He(a)}`
}

function Ja(a) {
    let e = Math.sign(a) < 0 ? "-" : "+";
    a = Math.abs(a);
    let r = Math.floor(a / 36e5), t = Math.floor(a % 36e5 / 6e4), n = Math.floor(a % 36e5 % 6e4 / 1e3),
        o = `${e}${String(r).padStart(2, "0")}:${String(t).padStart(2, "0")}`;
    return n !== 0 && (o += `:${String(n).padStart(2, "0")}`), o
}

function ka(a) {
    return `${he(a)}${Ja(a.offset)}[${a.timeZone}]`
}

function Nr(a) {
    let e = a.match(qr);
    if (!e) throw new Error(`Invalid ISO 8601 Duration string: ${a}`);
    let r = (c, i) => {
        if (!c) return 0;
        try {
            return (i ? -1 : 1) * Number(c.replace(",", "."))
        } catch {
            throw new Error(`Invalid ISO 8601 Duration string: ${a}`)
        }
    }, t = !!e.groups?.negative;
    if (!Fr.some(c => e.groups?.[c])) throw new Error(`Invalid ISO 8601 Duration string: ${a}`);
    if (e.groups?.time && !Ua.some(i => e.groups?.[i])) throw new Error(`Invalid ISO 8601 Duration string: ${a}`);
    let s = {
        years: r(e.groups?.years, t),
        months: r(e.groups?.months, t),
        weeks: r(e.groups?.weeks, t),
        days: r(e.groups?.days, t),
        hours: r(e.groups?.hours, t),
        minutes: r(e.groups?.minutes, t),
        seconds: r(e.groups?.seconds, t)
    };
    if (s.hours !== void 0 && s.hours % 1 !== 0 && (s.minutes || s.seconds)) throw new Error(`Invalid ISO 8601 Duration string: ${a} - only the smallest unit can be fractional`);
    if (s.minutes !== void 0 && s.minutes % 1 !== 0 && s.seconds) throw new Error(`Invalid ISO 8601 Duration string: ${a} - only the smallest unit can be fractional`);
    return s
}

function Xe(a) {
    let e = typeof a[0] == "object" ? a.shift() : new $, r;
    if (typeof a[0] == "string") r = a.shift(); else {
        let s = e.getEras();
        r = s[s.length - 1]
    }
    let t = a.shift(), n = a.shift(), o = a.shift();
    return [e, r, t, n, o]
}

var Pe, me = class me {
    constructor(...e) {
        W(this, Pe);
        let [r, t, n, o, s] = Xe(e);
        this.calendar = r, this.era = t, this.year = n, this.month = o, this.day = s, x(this)
    }

    copy() {
        return this.era ? new me(this.calendar, this.era, this.year, this.month, this.day) : new me(this.calendar, this.year, this.month, this.day)
    }

    add(e) {
        return K(this, e)
    }

    subtract(e) {
        return Fe(this, e)
    }

    set(e) {
        return $e(this, e)
    }

    cycle(e, r, t) {
        return le(this, e, r, t)
    }

    toDate(e) {
        return Ue(this, e)
    }

    toString() {
        return Ne(this)
    }

    compare(e) {
        return ve(this, e)
    }
};
Pe = new WeakMap;
var f = me, Ve, ze = class ze {
    constructor(e = 0, r = 0, t = 0, n = 0) {
        W(this, Ve);
        this.hour = e, this.minute = r, this.second = t, this.millisecond = n, _e(this)
    }

    copy() {
        return new ze(this.hour, this.minute, this.second, this.millisecond)
    }

    add(e) {
        return Qe(this, e)
    }

    subtract(e) {
        return Oa(this, e)
    }

    set(e) {
        return q(this, e)
    }

    cycle(e, r, t) {
        return ue(this, e, r, t)
    }

    toString() {
        return He(this)
    }

    compare(e) {
        return Oe(this, e)
    }
};
Ve = new WeakMap;
var v = ze, Ke, pe = class pe {
    constructor(...e) {
        W(this, Ke);
        let [r, t, n, o, s] = Xe(e);
        this.calendar = r, this.era = t, this.year = n, this.month = o, this.day = s, this.hour = e.shift() || 0, this.minute = e.shift() || 0, this.second = e.shift() || 0, this.millisecond = e.shift() || 0, x(this)
    }

    copy() {
        return this.era ? new pe(this.calendar, this.era, this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond) : new pe(this.calendar, this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond)
    }

    add(e) {
        return K(this, e)
    }

    subtract(e) {
        return Fe(this, e)
    }

    set(e) {
        return $e(q(this, e), e)
    }

    cycle(e, r, t) {
        switch (e) {
            case"era":
            case"year":
            case"month":
            case"day":
                return le(this, e, r, t);
            default:
                return ue(this, e, r, t)
        }
    }

    toDate(e, r) {
        return Ue(this, e, r)
    }

    toString() {
        return he(this)
    }

    compare(e) {
        let r = ve(this, e);
        return r === 0 ? Oe(this, p(e)) : r
    }
};
Ke = new WeakMap;
var O = pe, je, ye = class ye {
    constructor(...e) {
        W(this, je);
        let [r, t, n, o, s] = Xe(e), c = e.shift(), i = e.shift();
        this.calendar = r, this.era = t, this.year = n, this.month = o, this.day = s, this.timeZone = c, this.offset = i, this.hour = e.shift() || 0, this.minute = e.shift() || 0, this.second = e.shift() || 0, this.millisecond = e.shift() || 0, x(this)
    }

    copy() {
        return this.era ? new ye(this.calendar, this.era, this.year, this.month, this.day, this.timeZone, this.offset, this.hour, this.minute, this.second, this.millisecond) : new ye(this.calendar, this.year, this.month, this.day, this.timeZone, this.offset, this.hour, this.minute, this.second, this.millisecond)
    }

    add(e) {
        return We(this, e)
    }

    subtract(e) {
        return Ba(this, e)
    }

    set(e, r) {
        return Ra(this, e, r)
    }

    cycle(e, r, t) {
        return La(this, e, r, t)
    }

    toDate() {
        return Sa(this)
    }

    toString() {
        return ka(this)
    }

    toAbsoluteString() {
        return this.toDate().toISOString()
    }

    compare(e) {
        return this.toDate().getTime() - Ze(e, this.timeZone).toDate().getTime()
    }
};
je = new WeakMap;
var M = ye;
var F = [[1868, 9, 8], [1912, 7, 30], [1926, 12, 25], [1989, 1, 8], [2019, 5, 1]],
    Pr = [[1912, 7, 29], [1926, 12, 24], [1989, 1, 7], [2019, 4, 30]], be = [1867, 1911, 1925, 1988, 2018],
    A = ["meiji", "taisho", "showa", "heisei", "reiwa"];

function qa(a) {
    let e = F.findIndex(([r, t, n]) => a.year < r || a.year === r && a.month < t || a.year === r && a.month === t && a.day < n);
    return e === -1 ? F.length - 1 : e === 0 ? 0 : e - 1
}

function ea(a) {
    let e = be[A.indexOf(a.era)];
    if (!e) throw new Error("Unknown era: " + a.era);
    return new f(a.year + e, a.month, a.day)
}

var j = class extends $ {
    fromJulianDay(e) {
        let r = super.fromJulianDay(e), t = qa(r);
        return new f(this, A[t], r.year - be[t], r.month, r.day)
    }

    toJulianDay(e) {
        return super.toJulianDay(ea(e))
    }

    balanceDate(e) {
        let r = ea(e), t = qa(r);
        A[t] !== e.era && (e.era = A[t], e.year = r.year - be[t]), this.constrainDate(e)
    }

    constrainDate(e) {
        let r = A.indexOf(e.era), t = Pr[r];
        if (t != null) {
            let [n, o, s] = t, c = n - be[r];
            e.year = Math.max(1, Math.min(c, e.year)), e.year === c && (e.month = Math.min(o, e.month), e.month === o && (e.day = Math.min(s, e.day)))
        }
        if (e.year === 1 && r >= 0) {
            let [, n, o] = F[r];
            e.month = Math.max(n, e.month), e.month === n && (e.day = Math.max(o, e.day))
        }
    }

    getEras() {
        return A
    }

    getYearsInEra(e) {
        let r = A.indexOf(e.era), t = F[r], n = F[r + 1];
        if (n == null) return 9999 - t[0] + 1;
        let o = n[0] - t[0];
        return (e.month < n[1] || e.month === n[1] && e.day < n[2]) && o++, o
    }

    getDaysInMonth(e) {
        return super.getDaysInMonth(ea(e))
    }

    getMinimumMonthInYear(e) {
        let r = Fa(e);
        return r ? r[1] : 1
    }

    getMinimumDayInMonth(e) {
        let r = Fa(e);
        return r && e.month === r[1] ? r[2] : 1
    }

    constructor(...e) {
        super(...e), this.identifier = "japanese"
    }
};

function Fa(a) {
    if (a.year === 1) {
        let e = A.indexOf(a.era);
        return F[e]
    }
}

var Qa = -543, X = class extends $ {
    fromJulianDay(e) {
        let r = super.fromJulianDay(e), t = T(r.era, r.year);
        return new f(this, t - Qa, r.month, r.day)
    }

    toJulianDay(e) {
        return super.toJulianDay(_a(e))
    }

    getEras() {
        return ["BE"]
    }

    getDaysInMonth(e) {
        return super.getDaysInMonth(_a(e))
    }

    balanceDate() {
    }

    constructor(...e) {
        super(...e), this.identifier = "buddhist"
    }
};

function _a(a) {
    let [e, r] = Y(a.year + Qa);
    return new f(e, r, a.month, a.day)
}

var De = 1911;

function Ha(a) {
    return a.era === "minguo" ? a.year + De : 1 - a.year + De
}

function Wa(a) {
    let e = a - De;
    return e > 0 ? ["minguo", e] : ["before_minguo", 1 - e]
}

var z = class extends $ {
    fromJulianDay(e) {
        let r = super.fromJulianDay(e), t = T(r.era, r.year), [n, o] = Wa(t);
        return new f(this, n, o, r.month, r.day)
    }

    toJulianDay(e) {
        return super.toJulianDay(Ga(e))
    }

    getEras() {
        return ["before_minguo", "minguo"]
    }

    balanceDate(e) {
        let [r, t] = Wa(Ha(e));
        e.era = r, e.year = t
    }

    isInverseEra(e) {
        return e.era === "before_minguo"
    }

    getDaysInMonth(e) {
        return super.getDaysInMonth(Ga(e))
    }

    getYearsInEra(e) {
        return e.era === "before_minguo" ? 9999 : 9999 - De
    }

    constructor(...e) {
        super(...e), this.identifier = "roc"
    }
};

function Ga(a) {
    let [e, r] = Y(Ha(a));
    return new f(e, r, a.month, a.day)
}

var Na = 1948320, Pa = [0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336], ee = class {
    fromJulianDay(e) {
        let r = e - Na, t = 1 + Math.floor((33 * r + 3) / 12053), n = 365 * (t - 1) + Math.floor((8 * t + 21) / 33),
            o = r - n, s = o < 216 ? Math.floor(o / 31) : Math.floor((o - 6) / 30), c = o - Pa[s] + 1;
        return new f(this, t, s + 1, c)
    }

    toJulianDay(e) {
        let r = Na - 1 + 365 * (e.year - 1) + Math.floor((8 * e.year + 21) / 33);
        return r += Pa[e.month - 1], r += e.day, r
    }

    getMonthsInYear() {
        return 12
    }

    getDaysInMonth(e) {
        return e.month <= 6 ? 31 : e.month <= 11 || D(25 * e.year + 11, 33) < 8 ? 30 : 29
    }

    getMaximumMonthsInYear() {
        return 12
    }

    getMaximumDaysInMonth() {
        return 31
    }

    getEras() {
        return ["AP"]
    }

    getYearsInEra() {
        return 9377
    }

    constructor() {
        this.identifier = "persian"
    }
};
var aa = 78, Va = 80, ae = class extends $ {
    fromJulianDay(e) {
        let r = super.fromJulianDay(e), t = r.year - aa, n = e - w(r.era, r.year, 1, 1), o;
        n < Va ? (t--, o = g(r.year - 1) ? 31 : 30, n += o + 155 + 90 + 10) : (o = g(r.year) ? 31 : 30, n -= Va);
        let s, c;
        if (n < o) s = 1, c = n + 1; else {
            let i = n - o;
            i < 155 ? (s = Math.floor(i / 31) + 2, c = i % 31 + 1) : (i -= 155, s = Math.floor(i / 30) + 7, c = i % 30 + 1)
        }
        return new f(this, t, s, c)
    }

    toJulianDay(e) {
        let r = e.year + aa, [t, n] = Y(r), o, s;
        return g(n) ? (o = 31, s = w(t, n, 3, 21)) : (o = 30, s = w(t, n, 3, 22)), e.month === 1 ? s + e.day - 1 : (s += o + Math.min(e.month - 2, 5) * 31, e.month >= 8 && (s += (e.month - 7) * 30), s += e.day - 1, s)
    }

    getDaysInMonth(e) {
        return e.month === 1 && g(e.year + aa) || e.month >= 2 && e.month <= 6 ? 31 : 30
    }

    getYearsInEra() {
        return 9919
    }

    getEras() {
        return ["saka"]
    }

    balanceDate() {
    }

    constructor(...e) {
        super(...e), this.identifier = "indian"
    }
};
var xe = 1948440, Ka = 1948439, y = 1300, _ = 1600, Vr = 460322;

function Me(a, e, r, t) {
    return t + Math.ceil(29.5 * (r - 1)) + (e - 1) * 354 + Math.floor((3 + 11 * e) / 30) + a - 1
}

function er(a, e, r) {
    let t = Math.floor((30 * (r - e) + 10646) / 10631),
        n = Math.min(12, Math.ceil((r - (29 + Me(e, t, 1, 1))) / 29.5) + 1), o = r - Me(e, t, n, 1) + 1;
    return new f(a, t, n, o)
}

function ja(a) {
    return (14 + 11 * a) % 30 < 11
}

var B = class {
        fromJulianDay(e) {
            return er(this, xe, e)
        }

        toJulianDay(e) {
            return Me(xe, e.year, e.month, e.day)
        }

        getDaysInMonth(e) {
            let r = 29 + e.month % 2;
            return e.month === 12 && ja(e.year) && r++, r
        }

        getMonthsInYear() {
            return 12
        }

        getDaysInYear(e) {
            return ja(e.year) ? 355 : 354
        }

        getMaximumMonthsInYear() {
            return 12
        }

        getMaximumDaysInMonth() {
            return 30
        }

        getYearsInEra() {
            return 9665
        }

        getEras() {
            return ["AH"]
        }

        constructor() {
            this.identifier = "islamic-civil"
        }
    }, te = class extends B {
        fromJulianDay(e) {
            return er(this, Ka, e)
        }

        toJulianDay(e) {
            return Me(Ka, e.year, e.month, e.day)
        }

        constructor(...e) {
            super(...e), this.identifier = "islamic-tbla"
        }
    },
    Kr = "qgpUDckO1AbqBmwDrQpVBakGkgepC9QF2gpcBS0NlQZKB1QLagutBa4ETwoXBYsGpQbVCtYCWwmdBE0KJg2VDawFtgm6AlsKKwWVCsoG6Qr0AnYJtgJWCcoKpAvSC9kF3AJtCU0FpQpSC6ULtAW2CVcFlwJLBaMGUgdlC2oFqworBZUMSg2lDcoF1gpXCasESwmlClILagt1BXYCtwhbBFUFqQW0BdoJ3QRuAjYJqgpUDbIN1QXaAlsJqwRVCkkLZAtxC7QFtQpVCiUNkg7JDtQG6QprCasEkwpJDaQNsg25CroEWworBZUKKgtVC1wFvQQ9Ah0JlQpKC1oLbQW2AjsJmwRVBqkGVAdqC2wFrQpVBSkLkgupC9QF2gpaBasKlQVJB2QHqgu1BbYCVgpNDiULUgtqC60FrgIvCZcESwalBqwG1gpdBZ0ETQoWDZUNqgW1BdoCWwmtBJUFygbkBuoK9QS2AlYJqgpUC9IL2QXqAm0JrQSVCkoLpQuyBbUJ1gSXCkcFkwZJB1ULagVrCisFiwpGDaMNygXWCtsEawJLCaUKUgtpC3UFdgG3CFsCKwVlBbQF2gntBG0BtgimClINqQ3UBdoKWwmrBFMGKQdiB6kLsgW1ClUFJQuSDckO0gbpCmsFqwRVCikNVA2qDbUJugQ7CpsETQqqCtUK2gJdCV4ELgqaDFUNsga5BroEXQotBZUKUguoC7QLuQXaAloJSgukDdEO6AZqC20FNQWVBkoNqA3UDdoGWwWdAisGFQtKC5ULqgWuCi4JjwwnBZUGqgbWCl0FnQI=",
    ra, Q;

function ge(a) {
    return Vr + Q[a - y]
}

function re(a, e) {
    let r = a - y, t = 1 << 11 - (e - 1);
    return (ra[r] & t) === 0 ? 29 : 30
}

function Xa(a, e) {
    let r = ge(a);
    for (let t = 1; t < e; t++) r += re(a, t);
    return r
}

function za(a) {
    return Q[a + 1 - y] - Q[a - y]
}

var ne = class extends B {
    constructor() {
        if (super(), this.identifier = "islamic-umalqura", ra || (ra = new Uint16Array(Uint8Array.from(atob(Kr), e => e.charCodeAt(0)).buffer)), !Q) {
            Q = new Uint32Array(_ - y + 1);
            let e = 0;
            for (let r = y; r <= _; r++) {
                Q[r - y] = e;
                for (let t = 1; t <= 12; t++) e += re(r, t)
            }
        }
    }

    fromJulianDay(e) {
        let r = e - xe, t = ge(y), n = ge(_);
        if (r < t || r > n) return super.fromJulianDay(e);
        {
            let o = y - 1, s = 1, c = 1;
            for (; c > 0;) {
                o++, c = r - ge(o) + 1;
                let i = za(o);
                if (c === i) {
                    s = 12;
                    break
                } else if (c < i) {
                    let l = re(o, s);
                    for (s = 1; c > l;) c -= l, s++, l = re(o, s);
                    break
                }
            }
            return new f(this, o, s, r - Xa(o, s) + 1)
        }
    }

    toJulianDay(e) {
        return e.year < y || e.year > _ ? super.toJulianDay(e) : xe + Xa(e.year, e.month) + (e.day - 1)
    }

    getDaysInMonth(e) {
        return e.year < y || e.year > _ ? super.getDaysInMonth(e) : re(e.year, e.month)
    }

    getDaysInYear(e) {
        return e.year < y || e.year > _ ? super.getDaysInYear(e) : za(e.year)
    }
};
var ar = 347997, rr = 1080, tr = 24 * rr, jr = 29, Xr = 12 * rr + 793, zr = jr * tr + Xr;

function L(a) {
    return D(a * 7 + 1, 19) < 7
}

function Ie(a) {
    let e = Math.floor((235 * a - 234) / 19), r = 12084 + 13753 * e, t = e * 29 + Math.floor(r / 25920);
    return D(3 * (t + 1), 7) < 3 && (t += 1), t
}

function et(a) {
    let e = Ie(a - 1), r = Ie(a);
    return Ie(a + 1) - r === 356 ? 2 : r - e === 382 ? 1 : 0
}

function oe(a) {
    return Ie(a) + et(a)
}

function nr(a) {
    return oe(a + 1) - oe(a)
}

function at(a) {
    let e = nr(a);
    switch (e > 380 && (e -= 30), e) {
        case 353:
            return 0;
        case 354:
            return 1;
        case 355:
            return 2
    }
}

function Ce(a, e) {
    if (e >= 6 && !L(a) && e++, e === 4 || e === 7 || e === 9 || e === 11 || e === 13) return 29;
    let r = at(a);
    return e === 2 ? r === 2 ? 30 : 29 : e === 3 ? r === 0 ? 29 : 30 : e === 6 ? L(a) ? 30 : 0 : 30
}

var se = class {
    fromJulianDay(e) {
        let r = e - ar, t = r * tr / zr, n = Math.floor((19 * t + 234) / 235) + 1, o = oe(n), s = Math.floor(r - o);
        for (; s < 1;) n--, o = oe(n), s = Math.floor(r - o);
        let c = 1, i = 0;
        for (; i < s;) i += Ce(n, c), c++;
        c--, i -= Ce(n, c);
        let l = s - i;
        return new f(this, n, c, l)
    }

    toJulianDay(e) {
        let r = oe(e.year);
        for (let t = 1; t < e.month; t++) r += Ce(e.year, t);
        return r + e.day + ar
    }

    getDaysInMonth(e) {
        return Ce(e.year, e.month)
    }

    getMonthsInYear(e) {
        return L(e.year) ? 13 : 12
    }

    getDaysInYear(e) {
        return nr(e.year)
    }

    getMaximumMonthsInYear() {
        return 13
    }

    getMaximumDaysInMonth() {
        return 30
    }

    getYearsInEra() {
        return 9999
    }

    getEras() {
        return ["AM"]
    }

    balanceYearMonth(e, r) {
        r.year !== e.year && (L(r.year) && !L(e.year) && r.month > 6 ? e.month-- : !L(r.year) && L(e.year) && r.month > 6 && e.month++)
    }

    constructor() {
        this.identifier = "hebrew"
    }
};
var ta = 1723856, or = 1824665, na = 5500;

function we(a, e, r, t) {
    return a + 365 * e + Math.floor(e / 4) + 30 * (r - 1) + t - 1
}

function oa(a, e) {
    let r = Math.floor(4 * (e - a) / 1461), t = 1 + Math.floor((e - we(a, r, 1, 1)) / 30), n = e + 1 - we(a, r, t, 1);
    return [r, t, n]
}

function sr(a) {
    return Math.floor(a % 4 / 3)
}

function cr(a, e) {
    return e % 13 !== 0 ? 30 : sr(a) + 5
}

var R = class {
    fromJulianDay(e) {
        let [r, t, n] = oa(ta, e), o = "AM";
        return r <= 0 && (o = "AA", r += na), new f(this, o, r, t, n)
    }

    toJulianDay(e) {
        let r = e.year;
        return e.era === "AA" && (r -= na), we(ta, r, e.month, e.day)
    }

    getDaysInMonth(e) {
        return cr(e.year, e.month)
    }

    getMonthsInYear() {
        return 13
    }

    getDaysInYear(e) {
        return 365 + sr(e.year)
    }

    getMaximumMonthsInYear() {
        return 13
    }

    getMaximumDaysInMonth() {
        return 30
    }

    getYearsInEra(e) {
        return e.era === "AA" ? 9999 : 9991
    }

    getEras() {
        return ["AA", "AM"]
    }

    constructor() {
        this.identifier = "ethiopic"
    }
}, ce = class extends R {
    fromJulianDay(e) {
        let [r, t, n] = oa(ta, e);
        return r += na, new f(this, "AA", r, t, n)
    }

    getEras() {
        return ["AA"]
    }

    getYearsInEra() {
        return 9999
    }

    constructor(...e) {
        super(...e), this.identifier = "ethioaa"
    }
}, ie = class extends R {
    fromJulianDay(e) {
        let [r, t, n] = oa(or, e), o = "CE";
        return r <= 0 && (o = "BCE", r = 1 - r), new f(this, o, r, t, n)
    }

    toJulianDay(e) {
        let r = e.year;
        return e.era === "BCE" && (r = 1 - r), we(or, r, e.month, e.day)
    }

    getDaysInMonth(e) {
        let r = e.year;
        return e.era === "BCE" && (r = 1 - r), cr(r, e.month)
    }

    isInverseEra(e) {
        return e.era === "BCE"
    }

    balanceDate(e) {
        e.year <= 0 && (e.era = e.era === "BCE" ? "CE" : "BCE", e.year = 1 - e.year)
    }

    getEras() {
        return ["BCE", "CE"]
    }

    getYearsInEra(e) {
        return e.era === "BCE" ? 9999 : 9715
    }

    constructor(...e) {
        super(...e), this.identifier = "coptic"
    }
};

function rt(a) {
    switch (a) {
        case"buddhist":
            return new X;
        case"ethiopic":
            return new R;
        case"ethioaa":
            return new ce;
        case"coptic":
            return new ie;
        case"hebrew":
            return new se;
        case"indian":
            return new ae;
        case"islamic-civil":
            return new B;
        case"islamic-tbla":
            return new te;
        case"islamic-umalqura":
            return new ne;
        case"japanese":
            return new j;
        case"persian":
            return new ee;
        case"roc":
            return new z;
        default:
            return new $
    }
}

var sa = new Map, da = class {
    constructor(e, r = {}) {
        this.formatter = ir(e, r), this.options = r
    }

    format(e) {
        return this.formatter.format(e)
    }

    formatToParts(e) {
        return this.formatter.formatToParts(e)
    }

    formatRange(e, r) {
        if (typeof this.formatter.formatRange == "function") return this.formatter.formatRange(e, r);
        if (r < e) throw new RangeError("End date must be >= start date");
        return `${this.formatter.format(e)} \u2013 ${this.formatter.format(r)}`
    }

    formatRangeToParts(e, r) {
        if (typeof this.formatter.formatRangeToParts == "function") return this.formatter.formatRangeToParts(e, r);
        if (r < e) throw new RangeError("End date must be >= start date");
        let t = this.formatter.formatToParts(e), n = this.formatter.formatToParts(r);
        return [...t.map(o => ({...o, source: "startRange"})), {
            type: "literal",
            value: " \u2013 ",
            source: "shared"
        }, ...n.map(o => ({...o, source: "endRange"}))]
    }

    resolvedOptions() {
        let e = this.formatter.resolvedOptions();
        return ot() && (this.resolvedHourCycle || (this.resolvedHourCycle = st(e.locale, this.options)), e.hourCycle = this.resolvedHourCycle, e.hour12 = this.resolvedHourCycle === "h11" || this.resolvedHourCycle === "h12"), e.calendar === "ethiopic-amete-alem" && (e.calendar = "ethioaa"), e
    }
}, tt = {true: {ja: "h11"}, false: {}};

function ir(a, e = {}) {
    if (typeof e.hour12 == "boolean" && nt()) {
        e = {...e};
        let n = tt[String(e.hour12)][a.split("-")[0]], o = e.hour12 ? "h12" : "h23";
        e.hourCycle = n ?? o, delete e.hour12
    }
    let r = a + (e ? Object.entries(e).sort((n, o) => n[0] < o[0] ? -1 : 1).join() : "");
    if (sa.has(r)) return sa.get(r);
    let t = new Intl.DateTimeFormat(a, e);
    return sa.set(r, t), t
}

var ca = null;

function nt() {
    return ca == null && (ca = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: !1
    }).format(new Date(2020, 2, 3, 0)) === "24"), ca
}

var ia = null;

function ot() {
    return ia == null && (ia = new Intl.DateTimeFormat("fr", {
        hour: "numeric",
        hour12: !1
    }).resolvedOptions().hourCycle === "h12"), ia
}

function st(a, e) {
    if (!e.timeStyle && !e.hour) return;
    a = a.replace(/(-u-)?-nu-[a-zA-Z0-9]+/, ""), a += (a.includes("-u-") ? "" : "-u") + "-nu-latn";
    let r = ir(a, {...e, timeZone: void 0}),
        t = parseInt(r.formatToParts(new Date(2020, 2, 3, 0)).find(o => o.type === "hour").value, 10),
        n = parseInt(r.formatToParts(new Date(2020, 2, 3, 23)).find(o => o.type === "hour").value, 10);
    if (t === 0 && n === 23) return "h23";
    if (t === 24 && n === 23) return "h24";
    if (t === 0 && n === 11) return "h11";
    if (t === 12 && n === 11) return "h12";
    throw new Error("Unexpected hour cycle result")
}

export {
    X as BuddhistCalendar,
    f as CalendarDate,
    O as CalendarDateTime,
    ie as CopticCalendar,
    da as DateFormatter,
    ce as EthiopicAmeteAlemCalendar,
    R as EthiopicCalendar,
    $ as GregorianCalendar,
    se as HebrewCalendar,
    ae as IndianCalendar,
    B as IslamicCivilCalendar,
    te as IslamicTabularCalendar,
    ne as IslamicUmalquraCalendar,
    j as JapaneseCalendar,
    ee as PersianCalendar,
    z as TaiwanCalendar,
    v as Time,
    M as ZonedDateTime,
    rt as createCalendar,
    Da as endOfMonth,
    Cr as endOfWeek,
    gr as endOfYear,
    m as fromAbsolute,
    Aa as fromDate,
    vr as fromDateToLocal,
    Ye as getDayOfWeek,
    yr as getHoursInDay,
    E as getLocalTimeZone,
    Mr as getMinimumDayInMonth,
    xr as getMinimumMonthInYear,
    wr as getWeeksInMonth,
    k as isEqualCalendar,
    lr as isEqualDay,
    ur as isEqualMonth,
    hr as isEqualYear,
    Se as isSameDay,
    ma as isSameMonth,
    pa as isSameYear,
    mr as isToday,
    Sr as isWeekday,
    Ma as isWeekend,
    Er as maxDate,
    Tr as minDate,
    ya as now,
    Za as parseAbsolute,
    Hr as parseAbsoluteToLocal,
    Qr as parseDate,
    Wr as parseDateTime,
    Nr as parseDuration,
    _r as parseTime,
    Gr as parseZonedDateTime,
    Dr as resetLocalTimeZone,
    br as setLocalTimeZone,
    H as startOfMonth,
    ga as startOfWeek,
    Ae as startOfYear,
    u as toCalendar,
    Re as toCalendarDate,
    p as toCalendarDateTime,
    Br as toLocalTimeZone,
    Or as toTime,
    P as toTimeZone,
    Ze as toZoned,
    ba as today
};
//# sourceMappingURL=date.bundle.mjs.map