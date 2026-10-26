def split(items, names, claims, tax, tip):
    total_cost = sum(items.values())
    tax_rate = tax / total_cost 
    tip_rate = tip / total_cost

    totals = {}
    for name in names:
        totals[name] = 0

    for item in claims:
        cost = items[item]
        per_person_cost = cost / len(claims[item])
        for name in claims[item]:
            totals[name] = totals[name] + per_person_cost

    for name in totals:                 
        subtotal = totals[name]
        totals[name] = round(subtotal + subtotal * tax_rate + subtotal * tip_rate)

    return totals