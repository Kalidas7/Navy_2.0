"""
DRF serializers — the API's typed contract.

Even though the service layer already returns dicts in the frontend's shape,
serializing through explicit serializers (rather than dumping raw dicts) is the
industry-standard move: it documents every field, validates types, and gives one
authoritative place the contract is defined. These mirror the TS interfaces in
``frontend/src/types/index.ts`` field-for-field.
"""
from rest_framework import serializers


class ServerSerializer(serializers.Serializer):
    id = serializers.CharField()
    code = serializers.CharField()
    vessel = serializers.CharField()
    pennant = serializers.CharField()
    role = serializers.CharField()
    status = serializers.ChoiceField(choices=["online", "warn", "crit", "standby"])
    cpu = serializers.IntegerField()
    ram = serializers.IntegerField()
    temp = serializers.IntegerField()
    uptime = serializers.CharField()
    buf = serializers.ListField(child=serializers.FloatField())


class DriveBaySerializer(serializers.Serializer):
    id = serializers.CharField()
    used = serializers.IntegerField()
    temp = serializers.IntegerField()
    color = serializers.CharField()


class FanSerializer(serializers.Serializer):
    id = serializers.CharField()
    rpm = serializers.IntegerField()
    spin = serializers.FloatField()
    color = serializers.CharField()


class NetPortSerializer(serializers.Serializer):
    id = serializers.CharField()
    speed = serializers.CharField()
    state = serializers.ChoiceField(choices=["LINK UP", "DOWN"])
    in_ = serializers.CharField(source="in")  # `in` is a Python keyword
    out = serializers.CharField()
    color = serializers.CharField()

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Emit the JSON key as `in` (not `in_`) to match the frontend contract.
        rep["in"] = rep.pop("in_")
        return rep


class PsuModSerializer(serializers.Serializer):
    id = serializers.CharField()
    volt = serializers.FloatField()
    load = serializers.IntegerField()
    temp = serializers.IntegerField()
    state = serializers.CharField()
    color = serializers.CharField()


class PsuRailSerializer(serializers.Serializer):
    name = serializers.CharField()
    pct = serializers.IntegerField()
    color = serializers.CharField()


class StatusItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    state = serializers.CharField()
    color = serializers.CharField()


class SonarContactSerializer(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.CharField()
    bearing = serializers.IntegerField()
    range = serializers.IntegerField()
    x = serializers.IntegerField()
    y = serializers.IntegerField()
    color = serializers.CharField()
    blink = serializers.CharField()


class CompDataSerializer(serializers.Serializer):
    driveBays = DriveBaySerializer(many=True)
    fans = FanSerializer(many=True)
    netPorts = NetPortSerializer(many=True)
    psuMods = PsuModSerializer(many=True)
    psuRails = PsuRailSerializer(many=True)
    statusItems = StatusItemSerializer(many=True)
    contacts = SonarContactSerializer(many=True)


class TelemetrySerializer(serializers.Serializer):
    id = serializers.CharField()
    cpu = serializers.IntegerField()
    ram = serializers.IntegerField()
    temp = serializers.IntegerField()
    buf = serializers.ListField(child=serializers.FloatField())
    states = serializers.DictField(child=serializers.CharField())


class LogEntrySerializer(serializers.Serializer):
    id = serializers.CharField()
    t = serializers.CharField()
    lvl = serializers.ChoiceField(choices=["OK", "INFO", "WARN", "CRIT"])
    msg = serializers.CharField()
    color = serializers.CharField()
